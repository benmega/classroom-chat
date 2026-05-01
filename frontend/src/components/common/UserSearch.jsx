import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserSearchInput from './UserSearchInput';

const UserSearch = () => {
    const navigate = useNavigate();

    const handleSelectResult = (user) => {
        navigate(`/profile/${user.slug}`);
    };

    return (
        <div className="user-search-container">
            <UserSearchInput 
                onSelect={handleSelectResult} 
                placeholder="Search users..."
                containerClassName="user-search-adapter"
            />
        </div>
    );
};

export default UserSearch;

