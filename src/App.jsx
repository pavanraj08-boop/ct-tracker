import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertCircle, ExternalLink, Plus, Trash2, Star, Clock, DollarSign, Filter, Download, Upload, BarChart3, Target } from 'lucide-react';

export default function CTTracker() {
  const [influencers, setInfluencers] = useState([]);
  const [signals, setSignals] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [newInfluencer, setNewInfluencer] = useState({
    name: '', handle: '', tier: 'B', winRate: 0, followers: '', specialty: '', notes: '', twitter: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newSignal, setNewSignal] = useState({
    influencer: '', coin: '', action: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', 
    timestamp: '', outcome: 'pending', notes: '', exitPrice: '', positionSize: ''
  });
  const [filterTier, setFilterTier] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [influencers, signals, portfolioValue, riskPerTrade]);

  const loadData = async () => {
    try {
      const data = await window.storage.get('ct-tracker-data');
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        setInfluencers(parsed.influencers || []);
        setSignals(parsed.signals || []);
        setPortfolioValue(parsed.portfolioValue || 10000);
        setRiskPerTrade(parsed.riskPerTrade || 2);
      }
    } catch (error) {
      console.log('Starting fresh');
    }
  };

  const saveData = async () => {
    try {
      await window.storage.set('ct-tracker-data', JSON.stringify({
        influencers, signals, portfolioValue, riskPerTrade
      }));
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const calculatePositionSize = (entry, stop) => {
    const riskAmount = portfolioValue * (riskPerTrade / 100);
    const riskPerUnit = Math.abs(entry - stop);
    return riskPerUnit > 0 ? (riskAmount / riskPerUnit).toFixed(2) : 0;
  };

  const addInfluencer = () => {
    if (!newInfluencer.name || !newInfluencer.handle) return;
    
    setInfluencers([...influencers, {
      ...newInfluencer,
      id: Date.now(),
      winRate: Number(newInfluencer.winRate),
      totalCalls: 0,
      wins: 0,
      losses: 0,
      avgReturn: 0
    }]);
    setNewInfluencer({
      name: '', handle: '', tier: 'B', winRate: 0, followers: '', specialty: '', notes: '', twitter: ''
    });
  };

  const deleteInfluencer = (id) => {
    setInfluencers(influencers.filter(inf => inf.id !== id));
  };

  const addSignal = () => {
    if (!newSignal.influencer || !newSignal.coin || !newSignal.entryPrice) return;
    
    const entry = parseFloat(newSignal.entryPrice);
    const stop = parseFloat(newSignal.stopLoss);
    const posSize = stop ? calculatePositionSize(entry, stop) : '';
    
    const signal = {
      ...newSignal,
      id: Date.now(),
      timestamp: newSignal.timestamp || new Date().toISOString(),
      positionSize: posSize,
      entryPrice: entry,
      targetPrice: parseFloat(newSignal.targetPrice) || 0,
      stopLoss: stop || 0
    };
    
    setSignals([...signals, signal]);
    
    const inf = influencers.find(i => i.name === newSignal.influencer);
    if (inf) {
      updateInfluencerStats(inf.id, 'add');
    }
    
    setNewSignal({
      influencer: '', coin: '', action: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '',
      timestamp: '', outcome: 'pending', notes: '', exitPrice: '', positionSize: ''
    });
  };

  const updateInfluencerStats = (infId, action, outcome = null, pnl = 0) => {
    setInfluencers(influencers.map(inf => {
      if (inf.id !== infId) return inf;
      
      let updated = { ...inf };
      if (action === 'add') {
        updated.totalCalls = (inf.totalCalls || 0) + 1;
      } else if (action === 'complete' && outcome) {
        if (outcome === 'win') updated.wins = (inf.wins || 0) + 1;
        if (outcome === 'loss') updated.losses = (inf.losses || 0) + 1;
        
        const total = updated.wins + updated.losses;
        updated.winRate = total > 0 ? ((updated.wins / total) * 100).toFixed(1) : 0;
        
        const avgPnl = (inf.avgReturn * (total - 1) + pnl) / total;
        updated.avgReturn = avgPnl.toFixed(2);
      }
      
      return updated;
    }));
  };

  const updateSignalOutcome = (id, outcome, exitPrice) => {
    const signal = signals.find(s => s.id === id);
    if (!signal) return;
    
    const exit = parseFloat(exitPrice);
    const entry = parseFloat(signal.entryPrice);
    const pnlPercent = ((exit - entry) / entry * 100).toFixed(2);
    
    setSignals(signals.map(sig => 
      sig.id === id ? { ...sig, outcome, exitPrice: exit, pnl: pnlPercent } : sig
    ));
    
    const inf = influencers.find(i => i.name === signal.influencer);
    if (inf) {
      updateInfluencerStats(inf.id, 'complete', outcome, parseFloat(pnlPercent));
    }
  };

  const deleteSignal = (id) => {
    setSignals(signals.filter(sig => sig.id !== id));
  };

  const calculateStats = () => {
    const completed = signals.filter(s => s.outcome !== 'pending');
    const wins = completed.filter(s => s.outcome === 'win').length;
    const losses = completed.filter(s => s.outcome === 'loss').length;
    const winRate = completed.length > 0 ? ((wins / completed.length) * 100).toFixed(1) : 0;
    
    const totalPnl = completed.reduce((sum, sig) => sum + (parseFloat(sig.pnl) || 0), 0);
    const avgPnl = completed.length > 0 ? (totalPnl / completed.length).toFixed(2) : 0;
    
    return { 
      total: signals.length, 
      completed: completed.length, 
      pending: signals.filter(s => s.outcome === 'pending').length,
      wins, 
      losses, 
      winRate,
      totalPnl: totalPnl.toFixed(2),
      avgPnl
    };
  };

  const getTopInfluencers = () => {
    return influencers
      .filter(inf => (inf.totalCalls || 0) >= 3)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
      .slice(0, 5);
  };

  const getConfluencePlays = () => {
    const coinCounts = {};
    signals
      .filter(s => s.outcome === 'pending')
      .forEach(sig => {
        const inf = influencers.find(i => i.name === sig.influencer);
        if (inf && (inf.tier === 'S' || inf.tier === 'A')) {
          coinCounts[sig.coin] = coinCounts[sig.coin] || { count: 0, signals: [] };
          coinCounts[sig.coin].count++;
          coinCounts[sig.coin].signals.push(sig);
        }
      });
    
    return Object.entries(coinCounts)
      .filter(([coin, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count);
  };

  const getTierColor = (tier) => {
    const colors = {
      'S': 'bg-purple-500',
      'A': 'bg-blue-500',
      'B': 'bg-green-500',
      'C': 'bg-yellow-500',
      'D': 'bg-gray-500'
    };
    return colors[tier] || 'bg-gray-500';
  };

  const exportData = () => {
    const data = { influencers, signals, portfolioValue, riskPerTrade };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ct-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setInfluencers(data.influencers || []);
        setSignals(data.signals || []);
        setPortfolioValue(data.portfolioValue || 10000);
        setRiskPerTrade(data.riskPerTrade || 2);
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data');
      }
    };
    reader.readAsText(file);
  };

  const filteredSignals = signals
    .filter(sig => {
      const inf = influencers.find(i => i.name === sig.influencer);
      if (filterTier !== 'all' && inf?.tier !== filterTier) return false;
      if (filterOutcome !== 'all' && sig.outcome !== filterOutcome) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.timestamp) - new Date(a.timestamp);
      if (sortBy === 'pnl') return (parseFloat(b.pnl) || 0) - (parseFloat(a.pnl) || 0);
      return 0;
    });

  const stats = calculateStats();
  const topInfluencers = getTopInfluencers();
  const confluencePlays = getConfluencePlays();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <TrendingUp className="text-purple-400" />
            CT Tracker Pro
          </h1>
          <p className="text-gray-300">Advanced Crypto Twitter Intelligence Platform</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {['dashboard', 'influencers', 'signals', 'analytics', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                <div className="text-gray-300 text-xs">Total Signals</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-yellow-500/20 backdrop-blur-lg rounded-lg p-4 border border-yellow-500/30">
                <div className="text-yellow-300 text-xs">Pending</div>
                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              </div>
              <div className="bg-green-500/20 backdrop-blur-lg rounded-lg p-4 border border-green-500/30">
                <div className="text-green-300 text-xs">Wins</div>
                <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
              </div>
              <div className="bg-red-500/20 backdrop-blur-lg rounded-lg p-4 border border-red-500/30">
                <div className="text-red-300 text-xs">Losses</div>
                <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
              </div>
              <div className="bg-purple-500/20 backdrop-blur-lg rounded-lg p-4 border border-purple-500/30">
                <div className="text-purple-300 text-xs">Win Rate</div>
                <div className="text-2xl font-bold text-purple-400">{stats.winRate}%</div>
              </div>
              <div className="bg-blue-500/20 backdrop-blur-lg rounded-lg p-4 border border-blue-500/30">
                <div className="text-blue-300 text-xs">Avg P&L</div>
                <div className={`text-2xl font-bold ${parseFloat(stats.avgPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.avgPnl}%
                </div>
              </div>
            </div>

            {confluencePlays.length > 0 && (
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-lg p-6 border-2 border-orange-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="text-orange-400" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold text-orange-400">🔥 Confluence Plays - HIGH PROBABILITY</h2>
                    <p className="text-sm text-gray-300">Multiple S/A tier traders calling the same coin</p>
                  </div>
                </div>
                {confluencePlays.map(([coin, data]) => (
                  <div key={coin} className="bg-white/10 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-2xl font-bold text-orange-400">{coin}</span>
                        <span className="ml-3 bg-orange-500 px-3 py-1 rounded-full text-sm font-bold">
                          {data.count} Calls
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      {data.signals.map(sig => (
                        <div key={sig.id}>
                          • {sig.influencer} - {sig.action} @ ${sig.entryPrice} 
                          {sig.targetPrice > 0 && ` → Target: $${sig.targetPrice}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Star className="text-yellow-400" />
                Top Performing Traders
              </h2>
              <div className="space-y-3">
                {topInfluencers.map(inf => (
                  <div key={inf.id} className="bg-white/5 rounded-lg p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`${getTierColor(inf.tier)} px-3 py-1 rounded-full text-xs font-bold`}>
                        {inf.tier}
                      </span>
                      <div>
                        <div className="font-bold">{inf.name}</div>
                        <div className="text-sm text-gray-400">{inf.handle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">{inf.winRate}%</div>
                      <div className="text-xs text-gray-400">{inf.totalCalls} calls</div>
                    </div>
                  </div>
                ))}
                {topInfluencers.length === 0 && (
                  <p className="text-gray-400 text-center py-4">Add influencers and track signals to see top performers</p>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Recent Signals</h2>
              <div className="space-y-3">
                {signals.slice(0, 5).map(sig => (
                  <div key={sig.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold">{sig.coin}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          sig.action === 'BUY' || sig.action === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {sig.action}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          sig.outcome === 'pending' ? 'bg-yellow-500' :
                          sig.outcome === 'win' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {sig.outcome.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-400">{sig.influencer}</div>
                        {sig.pnl && (
                          <div className={`font-bold ${parseFloat(sig.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {sig.pnl}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'influencers' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Add Influencer</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newInfluencer.name}
                  onChange={(e) => setNewInfluencer({...newInfluencer, name: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Twitter Handle (@username)"
                  value={newInfluencer.handle}
                  onChange={(e) => setNewInfluencer({...newInfluencer, handle: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Twitter URL (optional)"
                  value={newInfluencer.twitter}
                  onChange={(e) => setNewInfluencer({...newInfluencer, twitter: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  value={newInfluencer.tier}
                  onChange={(e) => setNewInfluencer({...newInfluencer, tier: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                >
                  <option value="S">S Tier (Elite - 70%+)</option>
                  <option value="A">A Tier (High - 60-70%)</option>
                  <option value="B">B Tier (Medium - 50-60%)</option>
                  <option value="C">C Tier (Testing)</option>
                  <option value="D">D Tier (Watch Only)</option>
                </select>
                <input
                  type="text"
                  placeholder="Followers (e.g., 100K)"
                  value={newInfluencer.followers}
                  onChange={(e) => setNewInfluencer({...newInfluencer, followers: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Specialty (DeFi, NFT, Memes)"
                  value={newInfluencer.specialty}
                  onChange={(e) => setNewInfluencer({...newInfluencer, specialty: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
              </div>
              <textarea
                placeholder="Notes (track record, trading style, reliability, etc.)"
                value={newInfluencer.notes}
                onChange={(e) => setNewInfluencer({...newInfluencer, notes: e.target.value})}
                className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400 mb-4"
                rows="2"
              />
              <button
                onClick={addInfluencer}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus size={18} />
                Add Influencer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {influencers.map(inf => (
                <div key={inf.id} className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`${getTierColor(inf.tier)} px-3 py-1 rounded-full text-sm font-bold`}>
                        {inf.tier}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold">{inf.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-300 text-sm">{inf.handle}</p>
                          {inf.twitter && (
                            <a href={inf.twitter} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-400 hover:text-blue-300">
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteInfluencer(inf.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                    <div>
                      <div className="text-gray-400 text-xs">Win Rate</div>
                      <div className="text-lg font-semibold text-green-400">{inf.winRate || 0}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Total Calls</div>
                      <div className="text-lg font-semibold">{inf.totalCalls || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Wins</div>
                      <div className="text-lg font-semibold text-green-400">{inf.wins || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Followers</div>
                      <div className="text-lg font-semibold">{inf.followers}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Specialty</div>
                      <div className="text-lg font-semibold">{inf.specialty}</div>
                    </div>
                  </div>
                  {inf.notes && (
                    <p className="text-gray-300 text-sm bg-white/5 rounded p-2">{inf.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Log New Signal</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <select
                  value={newSignal.influencer}
                  onChange={(e) => setNewSignal({...newSignal, influencer: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                >
                  <option value="">Select Influencer</option>
                  {influencers.map(inf => (
                    <option key={inf.id} value={inf.name}>{inf.name} ({inf.tier})</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Coin (BTC, ETH, SOL)"
                  value={newSignal.coin}
                  onChange={(e) => setNewSignal({...newSignal, coin: e.target.value.toUpperCase()})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <select
                  value={newSignal.action}
                  onChange={(e) => setNewSignal({...newSignal, action: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                >
                  <option value="BUY">BUY (Spot)</option>
                  <option value="SELL">SELL</option>
                  <option value="LONG">LONG (Leverage)</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input
                  type="number"
                  step="0.00001"
                  placeholder="Entry Price"
                  value={newSignal.entryPrice}
                  onChange={(e) => setNewSignal({...newSignal, entryPrice: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="number"
                  step="0.00001"
                  placeholder="Target Price"
                  value={newSignal.targetPrice}
                  onChange={(e) => setNewSignal({...newSignal, targetPrice: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="number"
                  step="0.00001"
                  placeholder="Stop Loss"
                  value={newSignal.stopLoss}
                  onChange={(e) => setNewSignal({...newSignal, stopLoss: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400"
                />
                <input
                  type="datetime-local"
                  value={newSignal.timestamp}
                  onChange={(e) => setNewSignal({...newSignal, timestamp: e.target.value})}
                  className="bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                />
              </div>
              <textarea
                placeholder="Notes (reasoning, sentiment, technical analysis, etc.)"
                value={newSignal.notes}
                onChange={(e) => setNewSignal({...newSignal, notes: e.target.value})}
                className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400 mb-4"
                rows="2"
              />
              {newSignal.entryPrice && newSignal.stopLoss && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <div className="text-sm text-blue-300">
                    💡 Recommended Position Size: <span className="font-bold">{calculatePositionSize(parseFloat(newSignal.entryPrice), parseFloat(newSignal.stopLoss))} units</span>
                    <div className="text-xs mt-1">Based on {riskPerTrade}% risk per trade from ${portfolioValue} portfolio</div>
                  </div>
                </div>
              )}
              <button
                onClick={addSignal}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus size={18} />
                Log Signal
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter size={18} />
                  <span className="font-semibold">Filters:</span>
                </div>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="all">All Tiers</option>
                  <option value="S">S Tier</option>
                  <option value="A">A Tier</option>
                  <option value="B">B Tier</option>
                  <option value="C">C Tier</option>
                </select>
                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="all">All Outcomes</option>
                  <option value="pending">Pending</option>
                  <option value="win">Wins</option>
                  <option value="loss">Losses</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="recent">Most Recent</option>
                  <option value="pnl">Best P&L</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredSignals.map(sig => {
                const inf = influencers.find(i => i.name === sig.influencer);
                return (
                  <div key={sig.id} className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold">{sig.coin}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            sig.action === 'BUY' || sig.action === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {sig.action}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            sig.outcome === 'pending' ? 'bg-yellow-500' :
                            sig.outcome === 'win' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {sig.outcome.toUpperCase()}
                          </span>
                          {inf && (
                            <span className={`${getTierColor(inf.tier)} px-2 py-1 rounded text-xs font-bold`}>
                              {inf.tier}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">By {sig.influencer}</p>
                        <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {new Date(sig.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSignal(sig.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-gray-400 text-xs">Entry Price</div>
                        <div className="text-lg font-semibold">${sig.entryPrice}</div>
                      </div>
                      {sig.targetPrice > 0 && (
                        <div>
                          <div className="text-gray-400 text-xs">Target</div>
                          <div className="text-lg font-semibold text-green-400">${sig.targetPrice}</div>
                        </div>
                      )}
                      {sig.stopLoss > 0 && (
                        <div>
                          <div className="text-gray-400 text-xs">Stop Loss</div>
                          <div className="text-lg font-semibold text-red-400">${sig.stopLoss}</div>
                        </div>
                      )}
                      {sig.exitPrice && (
                        <div>
                          <div className="text-gray-400 text-xs">Exit Price</div>
                          <div className="text-lg font-semibold">${sig.exitPrice}</div>
                        </div>
                      )}
                    </div>
                    {sig.pnl && (
                      <div className={`text-2xl font-bold mb-2 ${parseFloat(sig.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        P&L: {sig.pnl}%
                      </div>
                    )}
                    {sig.positionSize && (
                      <div className="text-sm text-gray-400 mb-2">
                        Recommended Position: {sig.positionSize} units
                      </div>
                    )}
                    {sig.notes && (
                      <p className="text-gray-300 text-sm bg-white/5 rounded p-2 mb-3">{sig.notes}</p>
                    )}
                    {sig.outcome === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const price = prompt('Exit price:');
                            if (price) updateSignalOutcome(sig.id, 'win', price);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold"
                        >
                          ✓ Mark as Win
                        </button>
                        <button
                          onClick={() => {
                            const price = prompt('Exit price:');
                            if (price) updateSignalOutcome(sig.id, 'loss', price);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold"
                        >
                          ✗ Mark as Loss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h2 className="text-2xl font-bold mb-4">Performance by Tier</h2>
                {['S', 'A', 'B', 'C', 'D'].map(tier => {
                  const tierInfs = influencers.filter(i => i.tier === tier);
                  const tierSignals = signals.filter(s => {
                    const inf = influencers.find(i => i.name === s.influencer);
                    return inf?.tier === tier && s.outcome !== 'pending';
                  });
                  const wins = tierSignals.filter(s => s.outcome === 'win').length;
                  const total = tierSignals.length;
                  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={tier} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`${getTierColor(tier)} px-3 py-1 rounded-full text-sm font-bold`}>
                          {tier} Tier
                        </span>
                        <span className="text-lg font-bold">{winRate}%</span>
                      </div>
                      <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`${getTierColor(tier)} h-full`}
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {tierInfs.length} traders · {total} completed signals
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h2 className="text-2xl font-bold mb-4">Best Performing Coins</h2>
                <div>
                  {(() => {
                    const coinStats = {};
                    signals.filter(s => s.outcome !== 'pending').forEach(sig => {
                      if (!coinStats[sig.coin]) {
                        coinStats[sig.coin] = { wins: 0, total: 0, totalPnl: 0 };
                      }
                      coinStats[sig.coin].total++;
                      if (sig.outcome === 'win') coinStats[sig.coin].wins++;
                      coinStats[sig.coin].totalPnl += parseFloat(sig.pnl) || 0;
                    });
                    
                    const topCoins = Object.entries(coinStats)
                      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
                      .slice(0, 5);
                    
                    if (topCoins.length === 0) {
                      return <p className="text-gray-400 text-center py-4">No completed signals yet</p>;
                    }
                    
                    return topCoins.map(([coin, coinData]) => {
                      const winRate = ((coinData.wins / coinData.total) * 100).toFixed(1);
                      const avgPnl = (coinData.totalPnl / coinData.total).toFixed(2);
                      
                      return (
                        <div key={coin} className="mb-3 bg-white/5 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-lg">{coin}</span>
                            <div className="text-right">
                              <div className="text-green-400 font-bold">{winRate}%</div>
                              <div className="text-xs text-gray-400">{coinData.total} signals</div>
                            </div>
                          </div>
                          <div className={`text-sm ${parseFloat(avgPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Avg P&L: {avgPnl}%
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-lg p-6 border border-blue-500/30">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-blue-400" />
                Strategy Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-gray-300 text-sm mb-1">Total P&L</div>
                  <div className={`text-3xl font-bold ${parseFloat(stats.totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.totalPnl}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-300 text-sm mb-1">Best Trade</div>
                  <div className="text-3xl font-bold text-green-400">
                    {signals.filter(s => s.pnl).length > 0 
                      ? Math.max(...signals.filter(s => s.pnl).map(s => parseFloat(s.pnl))).toFixed(2)
                      : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-300 text-sm mb-1">Worst Trade</div>
                  <div className="text-3xl font-bold text-red-400">
                    {signals.filter(s => s.pnl).length > 0
                      ? Math.min(...signals.filter(s => s.pnl).map(s => parseFloat(s.pnl))).toFixed(2)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Portfolio Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Portfolio Value ($)</label>
                  <input
                    type="number"
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Recommended: 1-3% for conservative, 3-5% for aggressive</p>
                </div>
              </div>
              
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-bold mb-2">💡 Position Sizing Formula</h3>
                <p className="text-sm text-gray-300">
                  Position Size = (Portfolio Value × Risk%) ÷ (Entry Price - Stop Loss)
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Example: $10,000 portfolio with 2% risk and $1 risk per unit = 200 units
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Data Management</h2>
              <div className="flex gap-4">
                <button
                  onClick={exportData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                  <Download size={18} />
                  Export Data
                </button>
                <label className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Backup your data regularly. Export creates a JSON file you can import later.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="bg-white/5 rounded p-3">
                  <div className="font-bold text-purple-400 mb-1">Step 1: Add Influencers</div>
                  <p>Start by adding 10-15 crypto traders you follow on Twitter. Assign them initial tiers based on reputation.</p>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="font-bold text-purple-400 mb-1">Step 2: Track Signals (Paper Trade)</div>
                  <p>For 2-4 weeks, log every call they make without trading real money. This builds a performance database.</p>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="font-bold text-purple-400 mb-1">Step 3: Analyze & Re-tier</div>
                  <p>After tracking period, check the Analytics tab. Move high performers to S/A tier, poor performers to D tier.</p>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="font-bold text-purple-400 mb-1">Step 4: Trade Confluence</div>
                  <p>Only take trades when 2+ S/A tier traders call the same coin + your own analysis confirms it.</p>
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="font-bold text-purple-400 mb-1">Step 5: Manage Risk</div>
                  <p>Always use the calculated position sizes and stop losses. Never risk more than 2-5% per trade.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}