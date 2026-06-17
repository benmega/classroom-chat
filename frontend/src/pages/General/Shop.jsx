import React, { useState, useEffect } from 'react';
import { Shield, Loader2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import confetti from 'canvas-confetti';
import './Shop.css'; // Let's use a standard CSS file

const Shop = () => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await client.get('/api/shop/items');
            const sortedItems = response.data.sort((a, b) => {
                if (a.is_crowdfunded === b.is_crowdfunded) return a.base_price - b.base_price;
                return a.is_crowdfunded ? 1 : -1;
            });
            setItems(sortedItems);
        } catch {
            toast.error("Failed to load shop items");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (itemId) => {
        try {
            const response = await client.post(`/api/shop/purchase/${itemId}`);
            toast.success(response.data.message);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || "Purchase failed");
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
                {items.map(item => (
                    <div key={item.id} className={`shop-item-card ${item.is_purchased ? 'purchased' : ''} ${item.is_crowdfunded ? 'crowdfunded' : ''}`}>
                        <div className="shop-item-header">
                            <div className="shop-item-icon">
                                <Shield size={24} />
                            </div>
                            <div className="shop-item-price">
                                {item.base_price} Packets
                            </div>
                        </div>

                        <div className="shop-item-content">
                            <h3>{item.name}</h3>
                            <p>{item.description}</p>
                        </div>

                        <div className="shop-item-actions">
                            {item.is_purchased ? (
                                <button className="shop-btn-equipped" disabled>
                                    Owned
                                </button>
                            ) : item.is_crowdfunded ? (
                                <button className="shop-btn-coming-soon" disabled>
                                    Coming Soon
                                </button>
                            ) : (
                                <button 
                                    className="shop-btn-purchase" 
                                    onClick={() => handlePurchase(item.id)}
                                >
                                    Purchase
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Shop;
