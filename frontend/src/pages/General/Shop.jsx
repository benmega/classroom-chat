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
    const wallpaperInputRef = React.useRef(null);

    const apiBase = import.meta.env.VITE_API_URL || '';
    const fullApiUrl = apiBase.startsWith('http') ? apiBase : (window.location.origin + apiBase);

    const bookmarkletCode = `javascript:(function(){
        const url = window.location.href;
        if(!url.includes('codecombat.com/play') && !url.includes('ozaria.com/play') && !url.includes('codecombat.com/s/')) {
            alert('≡ƒÜ¿ This bookmarklet only works when you are on a CodeCombat or Ozaria level!');
            return;
        }
        const p=new URLSearchParams();p.append('url', url);p.append('helpers', '');p.append('notes', '');
        fetch('${fullApiUrl}/challenge/submit', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: p, credentials: 'include' })
        .then(async r => {
            let d;try{d=await r.json();}catch(e){d={success:false,message:'Server error ('+r.status+').'};}
            if(r.status===401){alert('≡ƒöæ Please log in to the Classroom Chat app first!');return;}
            if(d.success){alert('Γ£à Success! '+(d.message||'Challenge submitted.'));}else{alert('Γ¥î Failed:\\n\\n'+(d.message||d.error||'Unknown error.'));}
        })
        .catch(e => { alert('ΓÜá∩╕Å Network Error: Could not reach Classroom Chat server.'); });
    })();`.replace(/\n\s+/g, ' ');

    useEffect(() => {
        if (user?.chat_font_color) {
            setChatColor(user.chat_font_color);
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

    const handleColorChange = (e) => {
        setChatColor(e.target.value);
    };

    const handleColorSubmit = async () => {
        try {
            await client.put(`/api/shop/configure`, {
                perk_name: "chat_font_color",
                value: chatColor
            });
            await checkAuth(true); // Sync user state globally in background
        } catch (error) {
            toast.error("Failed to save color configuration.");
        }
    };

    const handleWallpaperUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('profile_wallpaper', file);
        try {
            await client.post('/user/api/profile-wallpaper', formData);
            toast.success("Wallpaper saved!");
            await checkAuth(true);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to upload wallpaper.");
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
                                                onBlur={handleColorSubmit}
                                                style={{ width: '40px', height: '40px', padding: '0', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' }}
                                            />
                                        </div>
                                    ) : item.name === "Custom Profile Wallpaper" ? (
                                        <div style={{ width: '100%', textAlign: 'center' }}>
                                            <input 
                                                type="file" 
                                                ref={wallpaperInputRef} 
                                                hidden 
                                                accept="image/*" 
                                                onChange={handleWallpaperUpload} 
                                            />
                                            <button 
                                                onClick={() => wallpaperInputRef.current?.click()} 
                                                className="shop-btn-purchase"
                                            >
                                                Upload Wallpaper
                                            </button>
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
                                    ) : item.name === "Permanent Double Duck" ? (
                                        <button className="shop-btn-equipped" disabled style={{ background: 'var(--success-color)', color: 'white' }}>
                                            Permanently Equipped
                                        </button>
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
