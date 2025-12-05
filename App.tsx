import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ImageFile, Post, Tab } from './types';
import { RabbitLogo } from './components/RabbitLogo';
import { savePostToDB, getPostsFromDB, saveProfileToStorage, getProfileFromStorage, UserProfile } from './services/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Upload State
  const [image, setImage] = useState<ImageFile | null>(null);
  const [note, setNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "余余",
    bio: "始于心动，终于白首。拥之则安，伴之则暖。一辈子很长，互牵。    ——刘"
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState({ name: "", bio: "" });

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Load Posts from IndexedDB
        const loadedPosts = await getPostsFromDB();
        setPosts(loadedPosts);

        // Load Profile from LocalStorage
        const loadedProfile = getProfileFromStorage();
        if (loadedProfile) {
          setUserProfile(loadedProfile);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleImageSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type;

      setImage({
        file,
        previewUrl: result,
        base64,
        mimeType
      });
      setNote("");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSavePost = async () => {
    if (image) {
      setIsSaving(true);
      try {
        const newPost: Post = {
          id: Date.now().toString(),
          image: image,
          description: note,
          date: new Date()
        };

        // Save to Database
        await savePostToDB(newPost);
        
        // Update Local State
        setPosts(prevPosts => [newPost, ...prevPosts]);
        
        // Reset upload state
        setImage(null);
        setNote("");
        
        // Navigate to Home
        setActiveTab('home');
      } catch (error) {
        console.error("Failed to save post", error);
        alert("保存失败，请重试");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleReset = () => {
    setImage(null);
    setNote("");
  };

  // Profile Handlers
  const startEditing = () => {
    setTempProfile(userProfile);
    setIsEditingProfile(true);
  };

  const saveProfile = () => {
    setUserProfile(tempProfile);
    saveProfileToStorage(tempProfile); // Persist profile
    setIsEditingProfile(false);
  };

  const cancelEditing = () => {
    setIsEditingProfile(false);
  };

  // Render Functions for Tabs
  const renderHome = () => (
    <div className="space-y-6 pb-24">
      <div className="px-6 pt-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-1">主页</h2>
        <p className="text-amber-700/60 text-sm tracking-wide">Gallery of Moments</p>
      </div>
      
      {isLoadingData ? (
         <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-pulse">
           <div className="w-16 h-16 bg-amber-100 rounded-full mb-4"></div>
           <div className="h-4 bg-amber-100 rounded w-32 mb-2"></div>
           <div className="h-3 bg-amber-50 rounded w-24"></div>
         </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-400">
            <RabbitLogo className="w-10 h-10" />
          </div>
          <p className="text-amber-800 font-medium mb-2">还没有照片哦</p>
          <p className="text-amber-600/60 text-sm mb-6">记录下你的第一个美好瞬间吧</p>
          <Button onClick={() => setActiveTab('upload')} variant="primary" className="shadow-amber-200">
            去上传
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-8 max-w-7xl mx-auto w-full">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-amber-100/50 border border-amber-50 flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="aspect-w-4 aspect-h-3 w-full">
                <img 
                  src={post.image.previewUrl} 
                  alt="Post" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                     <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200 shrink-0">
                        <RabbitLogo className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-bold text-amber-900 truncate max-w-[100px]">{userProfile.name}</span>
                  </div>
                  <span className="text-xs text-amber-400 font-medium bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {post.date.toLocaleDateString()}
                  </span>
                </div>
                {post.description && (
                  <p className="text-amber-800 text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap flex-grow">
                    {post.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMoments = () => (
    <div className="space-y-6 pb-24 h-full relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="px-6 pt-6 sticky top-14 bg-[#FFF8E1]/95 z-20 backdrop-blur-sm pb-4 border-b border-amber-100/50 max-w-3xl mx-auto w-full">
        <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-1">甜蜜时刻</h2>
        <p className="text-amber-700/60 text-sm tracking-wide">Sweet Timeline</p>
      </div>

      {isLoadingData ? (
         <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="h-64 bg-amber-50 w-full max-w-md rounded-xl"></div>
         </div>
      ) : posts.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-white border-2 border-dashed border-amber-200 rounded-full flex items-center justify-center mb-4 text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-amber-700">时间轴是空的</p>
          <p className="text-amber-500/60 text-sm mt-1">上传照片后，在这里查看回忆</p>
        </div>
      ) : (
        <div className="px-6 relative max-w-3xl mx-auto w-full">
          {/* Continuous Line */}
          <div className="absolute left-[38px] top-4 bottom-0 w-0.5 bg-amber-200"></div>
          
          <div className="space-y-10 py-4">
            {posts.map((post, index) => (
              <div key={post.id} className="relative flex group">
                {/* Timeline Node */}
                <div className="absolute left-[2px] top-0 flex flex-col items-center z-10">
                   <div className="w-6 h-6 rounded-full bg-amber-500 ring-4 ring-[#FFF8E1] shadow-md flex items-center justify-center">
                     <div className="w-2 h-2 bg-white rounded-full"></div>
                   </div>
                </div>

                <div className="ml-12 w-full">
                   {/* Date Badge */}
                   <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-3 shadow-sm">
                      {post.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                   </div>

                   {/* Content Card */}
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100/80 transition-transform duration-200 hover:scale-[1.01]">
                     <div className="flex gap-4">
                       <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-amber-50">
                         <img src={post.image.previewUrl} className="w-full h-full object-cover" alt="Moment thumbnail" />
                       </div>
                       <div className="flex-1 min-w-0 flex items-center">
                         <p className="text-amber-900/90 text-sm leading-relaxed line-clamp-3 font-medium">
                           {post.description || "分享了一张照片"}
                         </p>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="h-full flex flex-col pb-24 px-4 pt-6 max-w-3xl mx-auto w-full">
       <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-6 px-2">上传照片</h2>
       
       <div className="flex-1 overflow-y-auto no-scrollbar px-2">
        {!image ? (
          <ImageUploader onImageSelected={handleImageSelected} />
        ) : (
          <div className="space-y-6 animate-fade-in pb-4">
            <div className="relative rounded-2xl overflow-hidden bg-amber-50 border border-amber-200 max-h-[40vh] flex items-center justify-center shadow-lg">
              <img 
                src={image.previewUrl} 
                alt="Preview" 
                className="max-h-[40vh] w-full object-contain"
              />
              <button 
                onClick={handleReset}
                className="absolute top-3 right-3 p-2 bg-white/80 text-amber-900 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
               <label className="block text-sm font-bold text-amber-900 uppercase tracking-wider">记录这一刻 (可选)</label>
               <textarea
                 value={note}
                 onChange={(e) => setNote(e.target.value)}
                 placeholder="写下当下的心情..."
                 className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-300 min-h-[120px] shadow-sm resize-none"
               />
            </div>

            <Button onClick={handleSavePost} className="w-full py-3 text-lg shadow-amber-200 bg-amber-500 hover:bg-amber-600 text-white" isLoading={isSaving} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存照片"}
            </Button>
          </div>
        )}
       </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex flex-col items-center justify-center h-full pb-24 space-y-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-amber-100 to-transparent -z-10"></div>
      
      <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-xl shadow-amber-200 border-4 border-white mt-10">
         <RabbitLogo className="w-14 h-14 text-amber-500" />
      </div>
      
      <div className="text-center w-full max-w-xs mx-auto z-10">
        {isEditingProfile ? (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-100 space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 text-left">昵称</label>
              <input 
                type="text" 
                value={tempProfile.name}
                onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 text-left">简介</label>
              <textarea 
                value={tempProfile.bio}
                onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[80px]"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <Button onClick={cancelEditing} variant="secondary" className="flex-1 text-sm py-1.5">取消</Button>
              <Button onClick={saveProfile} variant="primary" className="flex-1 text-sm py-1.5 shadow-amber-200">保存</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">{userProfile.name}</h2>
            <p className="text-amber-700/80 leading-relaxed px-4 whitespace-pre-wrap">{userProfile.bio}</p>
            
            <button 
              onClick={startEditing}
              className="mt-4 text-amber-500 text-sm font-medium hover:text-amber-600 transition-colors flex items-center justify-center mx-auto px-4 py-1.5 rounded-full hover:bg-amber-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              编辑个人资料
            </button>
          </>
        )}
      </div>
      
      <div className="w-full max-w-sm px-6 space-y-4 mt-4">
        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-amber-100 shadow-sm transition-transform hover:scale-[1.02]">
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <span className="text-amber-900 font-medium">已发布照片</span>
           </div>
           <span className="text-amber-600 font-bold text-xl">{posts.length}</span>
        </div>
        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-amber-100 shadow-sm transition-transform hover:scale-[1.02]">
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <span className="text-amber-900 font-medium">甜蜜时刻</span>
           </div>
           <span className="text-amber-600 font-bold text-xl">{posts.length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-amber-900 font-sans selection:bg-amber-200 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFF8E1]/90 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <RabbitLogo className="w-8 h-8 text-amber-500" />
          <span className="text-xl font-serif-sc font-bold tracking-wide text-amber-900">余余</span>
        </div>
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'moments' && renderMoments()}
        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#FFF8E1]/95 backdrop-blur-lg border-t border-amber-100 pb-safe shadow-[0_-4px_6px_-1px_rgba(251,191,36,0.1)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            label="主页"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          />
          <NavButton 
            active={activeTab === 'moments'} 
            onClick={() => setActiveTab('moments')} 
            label="甜蜜时刻"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <NavButton 
            active={activeTab === 'upload'} 
            onClick={() => setActiveTab('upload')} 
            label="上传"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          />
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            label="我的"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${active ? 'text-amber-600 scale-105' : 'text-amber-400 hover:text-amber-500'}`}
  >
    <div className={`transform transition-transform duration-200 ${active ? '-translate-y-1' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] mt-1 font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;