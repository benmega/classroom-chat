import React, { useState, useEffect } from 'react';
import { Shield, Unlock, Star, Loader2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import './Shop.css'; // Let's use a standard CSS file
import WallpaperCropModal from '../../components/profile/WallpaperCropModal';

const Shop = () => {
    const { user, checkAuth } = useAuthStore();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState(null);
    const [chatColor, setChatColor] = useState('#facc15');
    const [borderSpeed, setBorderSpeed] = useState('normal');
    const wallpaperInputRef = React.useRef(null);
    
    const [isCropping, setIsCropping] = useState(false);
    const [cropImage, setCropImage] = useState(null);
    const [isUploadingPic, setIsUploadingPic] = useState(false);
    const cropperRef = React.useRef(null);
    const cropImgRef = React.useRef(null);

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
        if (user?.animated_border_speed) {
            setBorderSpeed(user.animated_border_speed);
        }
        fetchItems();
    }, [user]);

    const fetchItems = async () => {
        try {
            const response = await client.get('/api/shop/items');
            const sortedItems = response.data.sort((a, b) => {
                return a.base_price - b.base_price;
            });
            setItems(sortedItems);
        } catch {
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
        } catch {
            toast.error("Failed to save color configuration.");
        }
    };

    const handleBorderSpeedSubmit = async (speed) => {
        try {
            await client.put(`/api/shop/configure`, {
                perk_name: "animated_border_speed",
                value: speed
            });
            setBorderSpeed(speed);
            toast.success("Animation speed updated!");
            await checkAuth(true);
        } catch {
            toast.error("Failed to save animation speed.");
        }
    };

    const handleWallpaperUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            toast.error('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
        
        if (wallpaperInputRef.current) {
            wallpaperInputRef.current.value = '';
        }
    };

    const handleSaveCrop = async () => {
        if (!cropperRef.current) return;
        setIsUploadingPic(true);

        try {
            const canvas = cropperRef.current.getCroppedCanvas({
                width: 1200,
                height: 400,
                imageSmoothingQuality: 'high'
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error('Failed to process image.');
                    setIsUploadingPic(false);
                    return;
                }

                const formData = new FormData();
                formData.append('profile_wallpaper', blob, 'wallpaper.jpg');

                try {
                    await client.post('/user/api/profile-wallpaper', formData);
                    toast.success("Wallpaper saved!");
                    setIsCropping(false);
                    await checkAuth(true);
                } catch (error) {
                    toast.error(error.response?.data?.error || "Failed to upload wallpaper.");
                } finally {
                    setIsUploadingPic(false);
                }
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error('Cropping error:', err);
            toast.error('Error cropping image.');
            setIsUploadingPic(false);
        }
    };

    useEffect(() => {
        if (isCropping) {
            const loadCropper = async () => {
                if (typeof window.Cropper === 'undefined') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/static/lib/cropper.min.css';
                    document.head.appendChild(link);

                    const script = document.createElement('script');
                    script.src = '/static/lib/cropper.min.js';
                    script.async = true;
                    script.onload = () => initCropper();
                    document.body.appendChild(script);
                } else {
                    initCropper();
                }
            };

            const initCropper = () => {
                setTimeout(() => {
                    if (cropImgRef.current) {
                        cropperRef.current = new window.Cropper(cropImgRef.current, {
                            aspectRatio: 4 / 1,
                            viewMode: 2,
                            dragMode: 'move',
                            autoCropArea: 0.8,
                            restore: false,
                            guides: true,
                            center: true,
                            highlight: false,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            minCropBoxWidth: 300,
                            minCropBoxHeight: 100,
                        });
                    }
                }, 100);
            };

            loadCropper();
        }

        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [isCropping]);

    if (isLoading) {
        return (
            <div className="shop-loading">
                <Loader2 className="spinner" size={48} />
            </div>
        );
    }

    return (
        <div className="shop-page">
            <div className="shop-items-grid">
                {items.map(item => {
                    const isAffordable = user?.packets >= item.base_price;

                    
                    return (
                        <div key={item.id} className={`shop-item-card ${item.is_purchased ? 'purchased' : ''}`}>
                            <div className="shop-item-header" style={{ alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                        {item.name.replace('Profile ', '').replace('Permanent ', '').replace('Challenge ', '').replace('Font ', '')}
                                    </h3>
                                </div>
                                <div title={item.description} style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex', position: 'absolute', right: 0 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                                </div>
                            </div>
                            
                            <div className="shop-item-content">
                                
                                {item.name === "Chat Font Color" && (
                                    <div className="shop-preview chat-preview">
                                        <div className="chat-bubble-preview">
                                            <strong>User:</strong> <span style={{ color: chatColor || '#facc15', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>This is a test message to preview!</span>
                                        </div>
                                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Test color:</span>
                                            <input 
                                                type="color" 
                                                value={chatColor} 
                                                onChange={(e) => setChatColor(e.target.value)}
                                                style={{ width: '24px', height: '24px', padding: '0', cursor: 'pointer', border: 'none', background: 'transparent' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {item.name === "Animated Profile Border" && (
                                    <div className="shop-preview border-preview">
                                        <div 
                                            className="animated-border-preview"
                                            style={{ '--border-speed': borderSpeed === 'slow' ? '3s' : borderSpeed === 'fast' ? '0.5s' : '1.5s' }}
                                        >
                                            <img src={`https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`} alt="Avatar" />
                                        </div>
                                        {item.is_purchased && (
                                            <div style={{ marginTop: '15px', width: '100%' }}>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Animation Speed:</label>
                                                <select 
                                                    value={borderSpeed} 
                                                    onChange={(e) => handleBorderSpeedSubmit(e.target.value)}
                                                    className="form-control"
                                                    style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                                                >
                                                    <option value="slow">Slow</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="fast">Fast</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {item.name === "Custom Profile Wallpaper" && (
                                    <div className="shop-preview wallpaper-preview" style={{ padding: 0 }}>
                                        <div className="mini-profile-header">
                                            <div 
                                                className="mini-header-bg"
                                                style={{
                                                    backgroundImage: `url(${(item.is_purchased && user?.profile_wallpaper) ? (user.profile_wallpaper.startsWith('http') ? user.profile_wallpaper : (fullApiUrl + '/user/profile_wallpapers/' + user.profile_wallpaper)) : '/mobile_wallpaper_sample.png'})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}
                                            ></div>
                                            <div className="mini-header-content">
                                                <div className="mini-avatar">
                                                    <img src={user?.profile_picture_url ? (user.profile_picture_url.startsWith('http') ? user.profile_picture_url : (fullApiUrl + user.profile_picture_url)) : `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`} alt="Avatar" />
                                                </div>
                                                <div className="mini-info">
                                                    <div className="mini-name">{user?.nickname || user?.username || 'Student'}</div>
                                                    <div className="mini-username">@{user?.username || 'student'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {item.name === "Auto Challenge Claimer" && (
                                    <div className="shop-preview image-preview">
                                        <img src="/auto_challenge_claimer.png" alt="Claimer Preview" />
                                    </div>
                                )}

                                {item.name === "Auto Bitshift" && (
                                    <div className="shop-preview image-preview">
                                        <img src="/auto_bit_shift.png?v=3" alt="Bit Shift Preview" style={{ objectPosition: 'center 65%' }} />
                                    </div>
                                )}

                                {item.name === "Permanent Double Duck" && (
                                    <div className="shop-preview image-preview">
                                        <img src="/super_duck_2x.png?v=3" alt="Double Duck Preview" style={{ objectPosition: 'center 35%' }} />
                                    </div>
                                )}
                            </div>

                            <div className="shop-item-actions">
                                {item.is_purchased ? (
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
                                        {purchasingId === item.id ? <Loader2 className="spinner" size={16} /> : `${item.base_price.toFixed(3)} Packets`}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <WallpaperCropModal 
                isCropping={isCropping}
                cropImgRef={cropImgRef}
                cropImage={cropImage}
                isUploadingPic={isUploadingPic}
                onCancel={() => setIsCropping(false)}
                onSave={handleSaveCrop}
            />
        </div>
    );
};

export default Shop;
