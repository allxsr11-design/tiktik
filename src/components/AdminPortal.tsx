import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, DollarSign, Clock, Users, ArrowDownLeft, ArrowUpRight, Search, RefreshCw, KeyRound } from 'lucide-react';
import { WalletTransaction, PlayerProfile } from '../types';
import { getAllTransactionsForAdmin, processAdminTransaction } from '../utils/walletManager';
import { sounds } from '../utils/sound';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'users'>('deposits');
  
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [users, setUsers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const SECRET_ADMIN_CODE = '44551';

  useEffect(() => {
    if (isOpen && isUnlocked) {
      loadAdminData();
    }
  }, [isOpen, isUnlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.trim() === SECRET_ADMIN_CODE) {
      setIsUnlocked(true);
      sounds.playSuccess();
    } else {
      setStatusMsg('Invalid Secret Admin Access Code!');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const txs = await getAllTransactionsForAdmin();
      setTransactions(txs);

      // Load users
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as PlayerProfile);
        setUsers(list);
      }
    } catch (e) {
      console.warn('Admin load data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessTx = async (txId: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await processAdminTransaction(txId, status);
      sounds.playSuccess();
      setStatusMsg(`Transaction successfully marked as ${status}!`);
      await loadAdminData();
    } catch (err: any) {
      setStatusMsg(err?.message || 'Failed processing transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserCoins = async (userId: string, currentCoins: number, addAmount: number) => {
    const newTotal = currentCoins + addAmount;
    try {
      await setDoc(doc(db, 'users', userId), { coins: newTotal }, { merge: true });
      sounds.playSuccess();
      setStatusMsg(`Added ${addAmount} coins! New Balance: ${newTotal}`);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 p-4 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                SUPER ADMIN CONTROL PANEL
              </h2>
              <p className="text-xs text-red-300/80">Secret Management Access (Code: 44551)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {!isUnlocked ? (
          /* Secret Password Screen */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
              <KeyRound className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Enter Secret Admin Access Code</h3>
              <p className="text-xs text-slate-400 mt-1">Authorized personnel only. Enter '44551' to proceed.</p>
            </div>

            <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-3">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter Access Code (44551)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white font-mono text-lg tracking-widest focus:border-red-500 outline-none"
              />
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-600/30"
              >
                Unlock Secret Panel
              </button>
            </form>

            {statusMsg && <p className="text-xs font-semibold text-red-400">{statusMsg}</p>}
          </div>
        ) : (
          /* Unlocked Admin Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Overview Stats */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-950/80 border-b border-slate-800 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">Pending Deposits</div>
                <div className="text-lg font-black text-amber-400">
                  {transactions.filter((t) => t.type === 'deposit' && t.status === 'pending').length}
                </div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">Pending Withdrawals</div>
                <div className="text-lg font-black text-pink-400">
                  {transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending').length}
                </div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-slate-400 text-[10px]">Total Users</div>
                <div className="text-lg font-black text-emerald-400">{users.length}</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900 px-4 pt-2 gap-2">
              <button
                onClick={() => setActiveTab('deposits')}
                className={`py-2 px-4 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
                  activeTab === 'deposits'
                    ? 'bg-amber-500/20 text-amber-300 border-t-2 border-amber-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Deposit Requests
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`py-2 px-4 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
                  activeTab === 'withdrawals'
                    ? 'bg-red-500/20 text-red-300 border-t-2 border-red-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Withdrawal Requests
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-4 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'bg-emerald-500/20 text-emerald-300 border-t-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> Users & Coins
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {statusMsg && (
                <div className="p-3 bg-slate-800 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                  <span>{statusMsg}</span>
                  <button onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              {/* DEPOSITS LIST */}
              {activeTab === 'deposits' && (
                <div className="space-y-3">
                  {transactions
                    .filter((t) => t.type === 'deposit')
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{tx.userName}</span>
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              {tx.userTagId}
                            </span>
                          </div>
                          <span className="text-amber-400 font-extrabold text-sm">+{tx.amount} Coins</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                          <div>Method: <span className="text-white uppercase">{tx.method}</span></div>
                          <div>Sender: <span className="text-white">{tx.accountNo || 'N/A'}</span></div>
                          <div className="col-span-2">TrxID: <span className="text-amber-300 select-all">{tx.trxId}</span></div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                          {tx.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleProcessTx(tx.id, 'rejected')}
                                className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-bold border border-red-500/30"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleProcessTx(tx.id, 'approved')}
                                className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg font-extrabold shadow-md"
                              >
                                Approve & Credit Coins
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                tx.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* WITHDRAWALS LIST */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-3">
                  {transactions
                    .filter((t) => t.type === 'withdrawal')
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{tx.userName}</span>
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                              {tx.userTagId}
                            </span>
                          </div>
                          <span className="text-pink-400 font-extrabold text-sm">-{tx.amount} Coins</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                          <div>Payout via: <span className="text-white uppercase">{tx.method}</span></div>
                          <div className="col-span-2">Payout Account: <span className="text-pink-300 select-all">{tx.accountNo}</span></div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                          {tx.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleProcessTx(tx.id, 'rejected')}
                                className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-bold border border-red-500/30"
                              >
                                Reject & Refund
                              </button>
                              <button
                                onClick={() => handleProcessTx(tx.id, 'approved')}
                                className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg font-extrabold shadow-md"
                              >
                                Approve Payout
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                tx.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* USERS LIST */}
              {activeTab === 'users' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users by name or tag ID (#...)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  {users
                    .filter(
                      (u) =>
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.tagId && u.tagId.includes(searchQuery))
                    )
                    .map((user) => (
                      <div
                        key={user.id}
                        className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{user.avatar}</span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {user.name}
                              <span className="text-[10px] text-amber-400 font-mono">{user.tagId}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Wins: {user.wins} | Coins: <strong className="text-amber-300">{user.coins || 0}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAddUserCoins(user.id, user.coins || 0, 500)}
                            className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg text-[11px] font-bold border border-amber-500/30"
                          >
                            +500 Coins
                          </button>
                          <button
                            onClick={() => handleAddUserCoins(user.id, user.coins || 0, 1000)}
                            className="px-2.5 py-1 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg text-[11px] font-extrabold"
                          >
                            +1000 Coins
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
