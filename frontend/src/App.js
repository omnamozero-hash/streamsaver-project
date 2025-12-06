import React, { useState, useEffect } from 'react';
import { 
  Download, Link as LinkIcon, Youtube, Instagram, Twitter, Facebook, 
  Video, Music, AlertCircle, Loader2, Wifi, WifiOff, Video as VideoIcon,
  ClipboardCopy, ArrowRight, Bell, Lock, ShieldCheck
} from 'lucide-react';

// --- CONFIGURATION ---
const ACCESS_CODE = "1512"; 
const API_BASE_URL = 'https://streamsaver-backend.onrender.com'; // Your actual Render URL

const SocialMediaDownloader = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputCode, setInputCode] = useState('');
  
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking'); 

  useEffect(() => {
    console.log("APPLICATION STARTED: SocialMediaDownloader Loaded");
    const savedAuth = localStorage.getItem('streamSaverAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const checkServer = async () => {
        try {
          await fetch(`${API_BASE_URL}/`);
          setServerStatus('connected');
        } catch (err) {
          setServerStatus('disconnected');
        }
      };
      checkServer();
      const interval = setInterval(checkServer, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!url) { setPlatform(null); return; }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) setPlatform('youtube');
    else if (lowerUrl.includes('instagram')) setPlatform('instagram');
    else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) setPlatform('twitter');
    else if (lowerUrl.includes('tiktok')) setPlatform('tiktok');
    else if (lowerUrl.includes('facebook') || lowerUrl.includes('fb.watch')) setPlatform('facebook');
    else setPlatform('unknown');
  }, [url]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputCode === ACCESS_CODE) {
      setIsAuthenticated(true);
      localStorage.setItem('streamSaverAuth', 'true');
    } else {
      alert("Incorrect Access Code.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('streamSaverAuth');
    setResult(null);
    setUrl('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) { }
  };

  const handleAnalyze = async () => {
    if (!url) return;
    if (serverStatus === 'disconnected') {
      setError('Engine is offline.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch info');
      setResult(data);

    } catch (err) {
      setError('Could not analyze video.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format) => {
    setDownloadingFormat(format.id);
    const targetUrl = result.resolved_url || url;
    const downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(targetUrl)}&format=${format.id}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', ''); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingFormat(null), 4000);
  };

  const getPlatformIcon = (p) => {
    const className = "w-6 h-6 transition-all duration-300";
    switch(p) {
      case 'youtube': return <Youtube className={`${className} text-red-600`} />;
      case 'instagram': return <Instagram className={`${className} text-pink-600`} />;
      case 'twitter': return <Twitter className={`${className} text-blue-400`} />;
      case 'facebook': return <Facebook className={`${className} text-blue-700`} />;
      default: return <LinkIcon className={`${className} text-gray-400`} />;
    }
  };

  const getProxyImage = (imgUrl) => {
    if (!imgUrl) return '';
    if (imgUrl.startsWith(API_BASE_URL)) return imgUrl;
    return `${API_BASE_URL}/proxy_thumbnail?url=${encodeURIComponent(imgUrl)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 text-white shadow-lg">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Restricted Access</h1>
          <p className="text-gray-500 mb-8">Please enter access code.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 text-center text-2xl tracking-widest font-bold"
              placeholder="••••"
              maxLength={4}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="bg-white pb-20 pt-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-2 rounded-lg shadow-lg">
                <Download size={24} />
              </div>
              <span className="text-2xl font-black text-gray-900">Stream<span className="text-blue-600">Saver</span></span>
            </div>
            <div className="flex gap-3">
               <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border
                ${serverStatus === 'connected' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {serverStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {serverStatus === 'connected' ? 'Online' : 'Offline'}
              </div>
              <button onClick={handleLogout} className="px-4 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">Logout</button>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-6">Download Any Video</h1>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative bg-gray-50 rounded-xl flex items-center px-4">
              <div className="mr-3">{getPlatformIcon(platform)}</div>
              <input type="text" className="w-full bg-transparent py-4 outline-none text-gray-800 font-medium" placeholder="Paste video link here..." value={url} onChange={(e) => setUrl(e.target.value)} />
              <button onClick={handlePaste} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400"><ClipboardCopy size={18} /></button>
            </div>
            <button onClick={handleAnalyze} disabled={loading || !url} className="px-8 py-4 rounded-xl font-bold text-white shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>Analyze <ArrowRight size={18} /></>}
            </button>
          </div>
          {error && <div className="mt-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3"><AlertCircle /> {error}</div>}
        </div>
      </div>

      {result && (
        <div className="max-w-4xl mx-auto px-4 pb-10 -mt-10 relative z-20">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 flex flex-col md:flex-row gap-8">
            <div className="md:w-2/5 relative group">
              <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-lg relative">
                {result.thumbnail ? (
                  <img src={getProxyImage(result.thumbnail)} alt="Thumb" className="w-full h-full object-cover" 
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex'; }} />
                ) : null}
                <div className="fallback-icon w-full h-full absolute inset-0 flex items-center justify-center text-white/20 bg-gray-800" style={{display: result.thumbnail ? 'none' : 'flex'}}><VideoIcon size={48} /></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">{result.title}</h2>
                <p className="text-sm text-gray-500 font-medium">{result.author}</p>
              </div>

              <div className="space-y-3">
                {result.formats.map((fmt) => (
                  <button key={fmt.id} onClick={() => handleDownload(fmt)} disabled={downloadingFormat !== null} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center 
                        ${fmt.id === 'mp4' ? 'bg-blue-100 text-blue-600' : fmt.id === 'mp3' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                        {fmt.id === 'mp4' ? <Video size={20} /> : fmt.id === 'mp3' ? <Music size={20} /> : <Bell size={20} />}
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-gray-900 block">{fmt.quality}</span>
                        <span className="text-xs text-gray-500 font-semibold uppercase">{fmt.ext}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                      {downloadingFormat === fmt.id ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 py-10 mt-auto text-center">
        <div className="flex items-center justify-center gap-2 text-amber-600 mb-4"><ShieldCheck size={24} /><span className="font-black text-sm uppercase">Legal Disclaimer</span></div>
        <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
          Educational Purpose Only. Do not infringe copyright. Private Access Only.
        </p>
      </footer>
    </div>
  );
};

export default SocialMediaDownloader;
