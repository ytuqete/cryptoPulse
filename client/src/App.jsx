import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [allExchanges, setAllExchanges] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [marketStats, setMarketStats] = useState({ totalVol: 0 });

  const fetchData = async () => {
    try {
      const priceRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const btcPrice = priceRes.data.bitcoin.usd;

      const dexRes = await axios.get('https://api.llama.fi/overview/dexs');
      const dexParsed = (dexRes.data.protocols || []).map(d => ({
        id: d.slug, 
        name: d.name, 
        type: 'DEX',
        vol24h: Number(d.total24h) || 0,
        revenue24h: Number(d.dailyRevenue) || (Number(d.total24h) * 0.002),
        logo: d.logo
      }));

      const cexRes = await axios.get('https://api.coingecko.com/api/v3/exchanges?per_page=100');
      const cexParsed = (cexRes.data || []).map(c => {
        const volInBtc = c.trade_volume_24h_btc_normalized || c.trade_volume_24h_btc || 0;
        const volUsd = Number(volInBtc) * btcPrice;
        return {
          id: c.id, 
          name: c.name, 
          type: 'CEX',
          vol24h: volUsd,
          revenue24h: volUsd * 0.001,
          logo: c.image
        };
      });

      const combined = [...cexParsed, ...dexParsed].sort((a, b) => b.vol24h - a.vol24h);
      setAllExchanges(combined);
      setMarketStats({ totalVol: combined.reduce((acc, curr) => acc + curr.vol24h, 0) });
    } catch (err) { 
      console.error("SYNC ERROR:", err); 
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleAuth = async (e) => {
    e.preventDefault();
    const path = isLogin ? 'login' : 'register';
    try {
      const res = await axios.post(`http://localhost:5000/api/auth/${path}`, { email, password });
      if (isLogin) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('email', email);
      } else {
        setIsLogin(true);
        setMessage('REGISTRATION SUCCESSFUL');
      }
    } catch (err) { setMessage('AUTH FAILED'); }
  };

  if (token) {
    const filtered = allExchanges.filter(e => {
      const mS = e.name.toLowerCase().includes(searchTerm.toLowerCase());
      const mF = filterType === 'ALL' || e.type === filterType;
      return mS && mF;
    });

    return (
      <div className="dashboard">
        <div className="header-stats">
          <div className="stat-item">24H MARKET VOL: <span>${marketStats.totalVol.toLocaleString()}</span></div>
          <div className="stat-item feed-status">
            FEED: <div className="status-indicator"></div>
            <span className="mono-label">LIVE TERMINAL</span>
          </div>
        </div>
        
        <nav className="navbar">
          <div className="nav-left">
            <div className="logo" onClick={scrollToTop}>CRYPTOPULSE</div>
          </div>
          <div className="nav-center">
            <div className="filter-group">
              <button className={filterType === 'ALL' ? 'active' : ''} onClick={() => setFilterType('ALL')}><span>ALL</span></button>
              <button className={filterType === 'CEX' ? 'active' : ''} onClick={() => setFilterType('CEX')}><span>CEX</span></button>
              <button className={filterType === 'DEX' ? 'active' : ''} onClick={() => setFilterType('DEX')}><span>DEX</span></button>
            </div>
            <div className="search-wrapper">
              <input className="search-input" placeholder="SEARCH ASSET..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="nav-right">
            <button className="logout-btn" onClick={() => { localStorage.clear(); setToken(null); }}>EXIT TERMINAL</button>
          </div>
        </nav>

        <div className="table-container">
          <table className="defi-table">
            <thead>
              <tr>
                <th style={{width: '60px'}}>#</th>
                <th>EXCHANGE</th>
                <th style={{width: '120px'}}>TYPE</th>
                <th style={{width: '220px'}}>VOLUME (24H)</th>
                <th style={{width: '220px'}}>EST. REVENUE (24H)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex, i) => (
                <tr key={`${ex.id}-${i}`} className="table-row">
                  <td className="dim-text">{i + 1}</td>
                  <td className="proto-name"><img src={ex.logo} alt="" className="proto-logo" />{ex.name}</td>
                  <td><span className={`type-badge ${ex.type.toLowerCase()}`}>{ex.type}</span></td>
                  <td className="vol-amount">${ex.vol24h.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                  <td className="rev-amount">
                    ${ex.revenue24h.toLocaleString(undefined, {maximumFractionDigits:0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>CRYPTOPULSE</h1>
        <form onSubmit={handleAuth}>
          <input type="email" placeholder="ACCESS ID" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="SECRET KEY" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit">{isLogin ? 'LOG IN' : 'SIGN UP'}</button>
        </form>
        {message && <p className="status-msg">{message}</p>}
        <p className="toggle-link" onClick={() => {setIsLogin(!isLogin); setMessage('');}}>
          {isLogin ? 'CREATE ACCOUNT' : 'BACK TO LOGIN'}
        </p>
      </div>
    </div>
  );
}

export default App;