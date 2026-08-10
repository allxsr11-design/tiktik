import { db } from '../firebase/config';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { WalletTransaction, PlayerProfile } from '../types';
import { saveStoredProfile, getStoredProfile } from './profile';

const LOCAL_TXS_KEY = 'tictactoe_local_transactions';

function getLocalTransactions(): WalletTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_TXS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransaction(tx: WalletTransaction) {
  try {
    const list = getLocalTransactions();
    list.unshift(tx);
    localStorage.setItem(LOCAL_TXS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed saving local tx:', e);
  }
}

// 1. Submit Deposit Request
export async function submitDepositRequest(
  profile: PlayerProfile,
  method: 'bkash' | 'nagad' | 'usdt_binance',
  amount: number,
  accountNo: string,
  trxId: string
): Promise<WalletTransaction> {
  const tx: WalletTransaction = {
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    userId: profile.id,
    userName: profile.name,
    userTagId: profile.tagId || '#100000',
    type: 'deposit',
    method,
    amount,
    accountNo,
    trxId,
    status: 'pending',
    timestamp: Date.now(),
    note: `Deposit request via ${method.toUpperCase()}`,
  };

  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
  } catch (e) {
    console.warn('Firestore transaction save fallback to local:', e);
  }

  saveLocalTransaction(tx);
  return tx;
}

// 2. Submit Withdrawal Request
export async function submitWithdrawalRequest(
  profile: PlayerProfile,
  method: 'bkash' | 'nagad' | 'usdt_binance',
  amount: number,
  accountNo: string,
  pin: string
): Promise<WalletTransaction> {
  // Check PIN
  if (profile.txPin && profile.txPin !== pin) {
    throw new Error('Incorrect transaction PIN. Please enter your valid 4-digit security PIN.');
  }

  if (profile.coins < amount) {
    throw new Error('Insufficient coins balance for this withdrawal amount.');
  }

  // Deduct coins pending withdrawal
  const updatedProfile: PlayerProfile = {
    ...profile,
    coins: profile.coins - amount,
  };
  saveStoredProfile(updatedProfile);

  const tx: WalletTransaction = {
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    userId: profile.id,
    userName: profile.name,
    userTagId: profile.tagId || '#100000',
    type: 'withdrawal',
    method,
    amount,
    accountNo,
    status: 'pending',
    timestamp: Date.now(),
    note: `Withdrawal request to ${method.toUpperCase()} (${accountNo})`,
  };

  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
    await setDoc(doc(db, 'users', profile.id), { coins: updatedProfile.coins }, { merge: true });
  } catch (e) {
    console.warn('Firestore withdrawal save fallback to local:', e);
  }

  saveLocalTransaction(tx);
  return tx;
}

// 3. Wager Deduction / Win Payout
export async function applyMatchWagerResult(
  profile: PlayerProfile,
  betAmount: number,
  result: 'win' | 'loss' | 'draw'
): Promise<PlayerProfile> {
  if (betAmount <= 0) return profile;

  let newCoins = profile.coins;
  let txType: WalletTransaction['type'] = 'match_loss';
  let changeAmount = 0;

  if (result === 'win') {
    changeAmount = betAmount; // Win bet amount
    newCoins += changeAmount;
    txType = 'match_win';
  } else if (result === 'loss') {
    changeAmount = betAmount;
    newCoins = Math.max(0, newCoins - changeAmount);
    txType = 'match_loss';
  } else {
    // Draw -> no coin change
    return profile;
  }

  const updated: PlayerProfile = {
    ...profile,
    coins: newCoins,
  };
  saveStoredProfile(updated);

  const tx: WalletTransaction = {
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    userId: profile.id,
    userName: profile.name,
    userTagId: profile.tagId || '#100000',
    type: txType,
    method: 'coins',
    amount: changeAmount,
    status: 'approved',
    timestamp: Date.now(),
    note: result === 'win' ? `Won ${changeAmount} coins in Match!` : `Lost ${changeAmount} coins in Match.`,
  };

  try {
    await setDoc(doc(db, 'transactions', tx.id), tx);
    await setDoc(doc(db, 'users', profile.id), { coins: newCoins }, { merge: true });
  } catch (e) {
    console.warn('Wager result sync error:', e);
  }

  saveLocalTransaction(tx);
  return updated;
}

// 4. Fetch User Transactions
export async function getUserTransactions(userId: string): Promise<WalletTransaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as WalletTransaction);
      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (e) {
    console.warn('Failed fetching online transactions, using local:', e);
  }

  const local = getLocalTransactions().filter((t) => t.userId === userId);
  return local.sort((a, b) => b.timestamp - a.timestamp);
}

// 5. Admin: Fetch All Transactions
export async function getAllTransactionsForAdmin(): Promise<WalletTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'transactions'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as WalletTransaction);
      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (e) {
    console.warn('Admin fetch tx error:', e);
  }

  return getLocalTransactions().sort((a, b) => b.timestamp - a.timestamp);
}

// 6. Admin: Approve or Reject Request
export async function processAdminTransaction(
  txId: string,
  newStatus: 'approved' | 'rejected'
): Promise<void> {
  let targetTx: WalletTransaction | null = null;

  // Search local
  const localList = getLocalTransactions();
  const idx = localList.findIndex((t) => t.id === txId);
  if (idx !== -1) {
    localList[idx].status = newStatus;
    targetTx = localList[idx];
    localStorage.setItem(LOCAL_TXS_KEY, JSON.stringify(localList));
  }

  // Update Firestore
  try {
    const txRef = doc(db, 'transactions', txId);
    await updateDoc(txRef, { status: newStatus });
  } catch (e) {
    console.warn('Admin update tx Firestore error:', e);
  }

  // If approving deposit or rejecting withdrawal, credit back user's coins
  if (targetTx) {
    const profile = getStoredProfile();
    if (profile.id === targetTx.userId) {
      let coinAdjustment = 0;
      if (targetTx.type === 'deposit' && newStatus === 'approved') {
        coinAdjustment = targetTx.amount;
      } else if (targetTx.type === 'withdrawal' && newStatus === 'rejected') {
        coinAdjustment = targetTx.amount; // Refund coins
      }

      if (coinAdjustment !== 0) {
        const newCoins = profile.coins + coinAdjustment;
        const updated = { ...profile, coins: newCoins };
        saveStoredProfile(updated);
        try {
          await setDoc(doc(db, 'users', profile.id), { coins: newCoins }, { merge: true });
        } catch (e) {
          console.warn('Admin coin credit error:', e);
        }
      }
    }
  }
}
