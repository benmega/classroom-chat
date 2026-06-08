import React, { useState, useEffect } from 'react';
import { Shield, Unlock, Star, Loader2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import './Shop.css'; // Let's use a standard CSS file

const Shop = () => {
    const { user, checkAuth } = useAuthStore();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState(null);
    const [chatColor, setChatColor] = useState('#facc15');
    const [wallpaperUrl, setWallpaperUrl] = useState('');

    const apiBase = import.meta.env.VITE_API_URL || '';
    const fullApiUrl = apiBase.startsWith('http') ? apiBase : (window.location.origin + apiBase);

    const bookmarkletCode = `javascript:(function(){
        const url = window.location.href;
        if(!url.includes('codecombat.com/play') && !url.includes('ozaria.com/play') && !url.includes('codecombat.com/s/')) {
            alert('🚨 This bookmarklet only works when you are on a CodeCombat or Ozaria level!');
            return;
        }
        const p=new URLSearchParams();p.append('url', url);p.append('helpers', '');p.append('notes', '');
        fetch('${fullApiUrl}/challenge/submit', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: p, credentials: 'include' })
        .then(async r => {
            let d;try{d=await r.json();}catch(e){d={success:false,message:'Server error ('+r.status+').'};}
            if(r.status===401){alert('🔑 Please log in to the Classroom Chat app first!');return;}
            if(d.success){alert('✅ Success! '+(d.message||'Challenge submitted.'));}else{alert('❌ Failed:\\n\\n'+(d.message||d.error||'Unknown error.'));}
        })
        .catch(e => { alert('⚠️ Network Error: Could not reach Classroom Chat server.'); });
    })();`.replace(/\n\s+/g, ' ');

    useEffect(() => {
        if (user?.chat_font_color) {
            setChatColor(user.chat_font_color);
        }
        if (user?.profile_wallpaper) {
            setWallpaperUrl(user.profile_wallpaper);
        }
        fetchItems();
    }, [user]);

    const fetchItems = async () => {
        try {
            const response = await client.get('/api/shop/items');
            const sortedItems = response.data.sort((a, b) => {
                if (a.is_crowdfunded === b.is_crowdfunded) return a.base_price - b.base_price;
                return a.is_crowdfunded ? 1 : -1;
            });
            setItems(sortedItems);
        } catch (error) {
            toast.error("Failed to load shop items");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (itemId, itemName) => {
        setPurchasingId(itemId);
        try {
            await client.post(`/api/shop/purchase/${itemId}`);
            toast.success(`Successfully unlocked ${itemName}!`);
            await checkAuth(); 
            await fetchItems(); 
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to purchase ${itemName}`);
        } finally {
            setPurchasingId(null);
        }
    };

    const handleColorChange = async (e) => {
        const newColor = e.target.value;
        setChatColor(newColor);
        
        try {
            await client.put(`/api/shop/configure`, {
                perk_name: "chat_font_color",
                value: newColor
            });
            await checkAuth(); // Sync user state globally
        } catch (error) {
            toast.error("Failed to save color configuration.");
        }
    };

    const handleWallpaperChange = async () => {
        try {
            await client.put(`/api/shop/configure`, {
                perk_name: "profile_wallpaper",
                value: wallpaperUrl
            });
            toast.success("Wallpaper saved!");
            await checkAuth();
        } catch (error) {
            toast.error("Failed to save wallpaper.");
        }
    };

    if (isLoading) {
        return (
            <div className="shop-loading">
                <Loader2 className="spinner" size={48} />
            </div>
        );
    }

    return (
        <div className="shop-page">
            <div className="shop-page-header">
                <h2><ShoppingCart size={24} /> Packet Shop</h2>
            </div>

            <div className="shop-items-grid">
                {items.map(item => {
                    const isAffordable = user?.packets >= item.base_price;
                    const canPurchase = !item.is_purchased && !item.is_crowdfunded && isAffordable;
                    
                    return (
                        <div key={item.id} className={`shop-item-card ${item.is_crowdfunded ? 'crowdfunded' : ''} ${item.is_purchased ? 'purchased' : ''}`}>
                            <div className="shop-item-header">
                                <div className="shop-item-icon">
                                    {item.is_crowdfunded ? <Shield size={24} /> : item.is_purchased ? <Unlock size={24} /> : <Star size={24} />}
                                </div>
                                <div className="shop-item-price">
                                    {item.base_price.toFixed(3)} Packets
                                </div>
                            </div>
                            
                            <div className="shop-item-content">
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                            </div>

                            <div className="shop-item-actions">
                                {item.is_crowdfunded ? (
                                    <button className="shop-btn-coming-soon" disabled>
                                        Coming Soon
                                    </button>
                                ) : item.is_purchased ? (
                                    item.name === "Chat Font Color" ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Color:</span>
                                            <input 
                                                type="color" 
                                                value={chatColor} 
                                                onChange={handleColorChange}
                                                style={{ width: '40px', height: '40px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }}
                                            />
                                        </div>
                                    ) : item.name === "Custom Profile Wallpaper" ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', flexDirection: 'column' }}>
                                            <input 
                                                type="text" 
                                                value={wallpaperUrl} 
                                                onChange={(e) => setWallpaperUrl(e.target.value)}
                                                placeholder="Image URL..."
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            />
                                            <button onClick={handleWallpaperChange} className="shop-btn-purchase" style={{ padding: '0.4rem', fontSize: '0.8rem' }}>Save URL</button>
                                        </div>
                                    ) : item.name === "Auto Challenge Claimer" ? (
                                        <div style={{ width: '100%', textAlign: 'center' }}>
                                            <a 
                                                href={bookmarkletCode}
                                                className="shop-btn-purchase" 
                                                style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box', cursor: 'grab' }}
                                                title="Drag this button to your bookmarks bar!"
                                                onClick={(e) => { alert("Drag me to your bookmarks bar! Don't click me here!"); e.preventDefault(); }}
                                            >
                                                Drag to Bookmarks
                                            </a>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Drag to bookmarks bar</span>
                                        </div>
                                    ) : (
                                        <button className="shop-btn-equipped" disabled>
                                            Owned
                                        </button>
                                    )
                                ) : (
                                    <button 
                                        className={`shop-btn-purchase ${!isAffordable ? 'disabled' : ''}`}
                                        disabled={!isAffordable || purchasingId === item.id}
                                        onClick={() => handlePurchase(item.id, item.name)}
                                    >
                                        {purchasingId === item.id ? <Loader2 className="spinner" size={16} /> : 'Purchase'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Shop;
