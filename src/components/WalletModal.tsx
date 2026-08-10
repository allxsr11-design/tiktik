import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, History, ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle, Copy, Check } from 'lucide-react';
import { PlayerProfile, WalletTransaction } from '../types';
import { submitDepositRequest, submitWithdrawalRequest, getUserTransactions } from '../utils/walletManager';
import { saveStoredProfile } from '../utils/profile';
import { sounds } from '../utils/sound';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'security'>('deposit');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'usdt_binance'>('bkash');
  const [amount, setAmount] = useState<number>(500);
  const [accountNo, setAccountNo] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<string>('');
  
  const [txHistory, setTxHistory] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Merchant numbers for demo/deposit instructions
  const MERCHANT_INFO = {
    bkash: { number: '01700000000 (Merchant/Personal)', type: 'bKash Send Money / Cash In' },
    nagad: { number: '01800000000 (Personal)', type: 'Nagad Send Money' },
    usdt_binance: { number: 'TRC20: T9zP2kQ1vL8mN3xJ7yR4wE6uC5aK8pZ', type: 'USDT (TRC20) / Binance Pay ID: 88492019' },
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, profile.id]);

  const fetchHistory = async () => {
    setLoading(true);
    const list = await getUserTransactions(profile.id);
    setTxHistory(list);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100) {
      setErrorMsg('Minimum deposit is 100 coins.');
      return;
    }
    if (!accountNo.trim() || !trxId.trim()) {
      setErrorMsg('Please provide your sender account number and Transaction ID (TrxID).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await submitDepositRequest(profile, method, amount, accountNo.trim(), trxId.trim());
      sounds.playSuccess();
      setSuccessMsg('Deposit request submitted successfully! Pending admin approval.');
      setTrxId('');
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit deposit request.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 200) {
      setErrorMsg('Minimum withdrawal is 200 coins.');
      return;
    }
    if (!accountNo.trim()) {
      setErrorMsg('Please enter your account number or USDT address.');
      return;
    }
    if (profile.txPin && !pin.trim()) {
      setErrorMsg('Please enter your 4-digit transaction PIN.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await submitWithdrawalRequest(profile, method, amount, accountNo.trim(), pin.trim());
      sounds.playSuccess();
      setSuccessMsg('Withdrawal request submitted! Coins held pending payout approval.');
      onUpdateProfile({ ...profile, coins: Math.max(0, profile.coins - amount) });
      setPin('');
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMsg('Transaction PIN must be exactly 4 numeric digits.');
      return;
    }
    const updated = { ...profile, txPin: newPin };
    saveStoredProfile(updated);
    onUpdateProfile(updated);
    setPinSuccess('Transaction PIN updated successfully!');
    setNewPin('');
    sounds.playSuccess();
  };

  const copyMerchantNumber = () => {
    navigator.clipboard.writeText(MERCHANT_INFO[method].number);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/40 via-slate-900 to-yellow-900/40 p-4 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Coin Wallet
                <span className="text-xs bg-amber-500/20 text-amber-300 font-normal px-2 py-0.5 rounded-full border border-amber-500/30">
                  {profile.tagId || '#100000'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Manage deposits, withdrawals & game stakes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Balance Bar */}
        <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="text-sm text-slate-400">Available Coins:</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-amber-400">🪙 {profile.coins.toLocaleString()}</span>
            <span className="text-xs text-slate-400">(≈ ৳{profile.coins})</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => { setActiveTab('deposit'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'deposit'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" /> Deposit
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'withdraw'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchHistory(); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" /> History
          </button>
          <button
            onClick={() => { setActiveTab('security'); setErrorMsg(''); setPinSuccess(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Security
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* DEPOSIT TAB */}
          {activeTab === 'deposit' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('bkash')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'bkash'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>💖 bKash</span>
                    <span className="text-[10px] opacity-75">Cash In / Send</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('nagad')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'nagad'
                        ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🟠 Nagad</span>
                    <span className="text-[10px] opacity-75">Send Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('usdt_binance')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'usdt_binance'
                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🌐 Binance USDT</span>
                    <span className="text-[10px] opacity-75">Crypto TRC20</span>
                  </button>
                </div>
              </div>

              {/* Deposit Payment Details */}
              <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs space-y-2">
                <div className="text-amber-400 font-bold flex items-center justify-between">
                  <span>Send Payment To:</span>
                  <button
                    type="button"
                    onClick={copyMerchantNumber}
                    className="text-[11px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2 py-0.5 rounded transition flex items-center gap-1"
                  >
                    {copiedAccount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedAccount ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-white select-all bg-slate-900/80 p-2 rounded border border-slate-700 break-all">
                  {MERCHANT_INFO[method].number}
                </div>
                <p className="text-[11px] text-slate-400">
                  Send the required amount to the number/address above, then fill in your TrxID below for verification.
                </p>
              </div>

              {/* Amount Quick Options */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Deposit Amount (1 Coin = ৳1)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[200, 500, 1000, 2000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-1.5 text-xs rounded-lg border font-bold transition ${
                        amount === val
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +{val} Coins
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
                  placeholder="Enter custom coin amount"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Your Sender Account / Phone No.</label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
                  placeholder="e.g. 017XXXXXXXX or Binance Pay ID"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Transaction ID (TrxID / Proof)</label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none font-mono"
                  placeholder="e.g. 9J28A110X"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold py-3 rounded-xl hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Submitting...' : 'Submit Deposit Request'}
              </button>
            </form>
          )}

          {/* WITHDRAW TAB */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Withdrawal Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('bkash')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'bkash'
                        ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>💖 bKash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('nagad')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'nagad'
                        ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🟠 Nagad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('usdt_binance')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      method === 'usdt_binance'
                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🌐 Binance USDT</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Withdraw Amount (Coins)</label>
                <input
                  type="number"
                  min="200"
                  max={profile.coins}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
                  placeholder="Minimum 200 coins"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Your Payment Account / Address</label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
                  placeholder="e.g. 017XXXXXXXX or TRC20 Wallet Address"
                />
              </div>

              {profile.txPin && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">4-Digit Security PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 outline-none font-mono tracking-widest text-center"
                    placeholder="••••"
                  />
                </div>
              )}

              {!profile.txPin && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                  💡 Tip: Set up a 4-Digit Security PIN in the Security tab to prevent unauthorized withdrawals.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold py-3 rounded-xl hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Processing...' : 'Request Cashout'}
              </button>
            </form>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {loading && <p className="text-xs text-slate-400 text-center py-4">Loading transaction records...</p>}
              {!loading && txHistory.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No transaction records found yet.</p>
              )}
              {txHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        tx.type === 'deposit' || tx.type === 'match_win' || tx.type === 'welcome_bonus'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {tx.type === 'deposit' && <ArrowDownLeft className="w-4 h-4" />}
                      {tx.type === 'withdrawal' && <ArrowUpRight className="w-4 h-4" />}
                      {tx.type === 'match_win' && '🏆'}
                      {tx.type === 'match_loss' && '💔'}
                      {tx.type === 'welcome_bonus' && '🎁'}
                    </div>
                    <div>
                      <div className="font-bold text-white capitalize">{tx.type.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                      {tx.trxId && <div className="text-[10px] text-slate-400">TrxID: {tx.trxId}</div>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black ${
                        tx.type === 'deposit' || tx.type === 'match_win' || tx.type === 'welcome_bonus'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {tx.type === 'deposit' || tx.type === 'match_win' || tx.type === 'welcome_bonus' ? '+' : '-'}
                      {tx.amount} Coins
                    </div>
                    <div className="mt-0.5">
                      {tx.status === 'approved' && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {tx.status === 'pending' && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {tx.status === 'rejected' && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECURITY PIN TAB */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300">
                🔒 <strong className="text-white">Transaction PIN Protection</strong>
                <p className="text-[11px] text-slate-400 mt-1">
                  Set a secret 4-digit PIN required before processing any coin withdrawals or transfer requests.
                </p>
              </div>

              {pinSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">New 4-Digit Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base focus:border-amber-500 outline-none tracking-widest text-center font-mono"
                  placeholder="••••"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold py-3 rounded-xl hover:brightness-110 active:scale-[0.99] transition shadow-lg"
              >
                Save Security PIN
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
