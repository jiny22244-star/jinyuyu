import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ImageFile, Post, Tab, DiaryEntry, FirebaseConfig, ViewMode } from './types';
import { RabbitLogo } from './components/RabbitLogo';
import { GalleryViews } from './components/GalleryViews';
import { InteractiveTree } from './components/InteractiveTree';
import { 
  savePostToDB, 
  getPostsFromDB, 
  saveProfileToStorage, 
  getProfileFromStorage, 
  UserProfile,
  saveDiaryEntryToDB,
  getDiaryEntriesFromDB,
  deleteDiaryEntryFromDB,
  exportAllData,
  importAllData,
  BackupData,
  getCloudConfig,
  saveCloudConfig,
  removeCloudConfig,
  uploadPostImage
} from './services/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Auth State - Changed to localStorage for persistence
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Upload State
  const [image, setImage] = useState<ImageFile | null>(null);
  const [note, setNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Diary State
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [isWritingDiary, setIsWritingDiary] = useState(false);
  const [diaryForm, setDiaryForm] = useState({ title: '', content: '' });

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "余余",
    bio: "始于心动，终于白首。拥之则安，伴之则暖。一辈子很长，互牵。    ——刘"
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState({ name: "", bio: "" });
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync State
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [cloudConfig, setCloudConfig] = useState<FirebaseConfig>({
    apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
  });
  const [isCloudActive, setIsCloudActive] = useState(false);

  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isEffectMenuOpen, setIsEffectMenuOpen] = useState(false);
  // Separate state for the immersive 3D modal
  const [showInteractiveTree, setShowInteractiveTree] = useState(false);

  // Initial Data Load
  useEffect(() => {
    // Check local storage auth
    const localAuth = localStorage.getItem('yuyu_auth');
    if (localAuth === 'true') {
      setIsLoggedIn(true);
    }

    // Check cloud config
    const storedConfig = getCloudConfig();
    if (storedConfig) {
      setIsCloudActive(true);
      setCloudConfig(storedConfig);
    }

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const loadedProfile = getProfileFromStorage();
        if (loadedProfile) {
          setUserProfile(loadedProfile);
        }

        if (localAuth === 'true') {
          await refreshData();
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const refreshData = async () => {
    // This will fetch from Cloud if isCloudActive is true (handled in services/storage)
    const loadedPosts = await getPostsFromDB();
    setPosts(loadedPosts);
    const loadedDiary = await getDiaryEntriesFromDB();
    setDiaryEntries(loadedDiary);
  };

  // Effect to load secure data when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      setIsLoadingData(true);
      refreshData().finally(() => setIsLoadingData(false));
    }
  }, [isLoggedIn]);

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'yuyu' && loginForm.password === '1009') {
      setIsLoggedIn(true);
      localStorage.setItem('yuyu_auth', 'true'); // Persist login
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('yuyu_auth');
    setPosts([]);
    setDiaryEntries([]);
    setActiveTab('profile');
  };

  // Upload Handlers
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
        let imageUrl = undefined;
        // If file exists, upload it (Cloud logic inside uploadPostImage)
        if (image.file) {
          imageUrl = await uploadPostImage(image.file);
        }

        const newPost: Post = {
          id: Date.now().toString(),
          image: image, // Local preview
          description: note,
          date: new Date(),
          imageUrl: imageUrl // Cloud URL if uploaded
        };

        await savePostToDB(newPost);
        
        // Refresh full list to ensure sync
        await refreshData();
        
        setImage(null);
        setNote("");
        setActiveTab('home');
      } catch (error) {
        console.error("Failed to save post", error);
        alert("保存失败，请检查网络或配置");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleResetUpload = () => {
    setImage(null);
    setNote("");
  };

  // Diary Handlers
  const startWritingDiary = (entry?: DiaryEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setDiaryForm({ title: entry.title, content: entry.content });
    } else {
      setEditingEntry(null);
      setDiaryForm({ title: '', content: '' });
    }
    setIsWritingDiary(true);
  };

  const cancelWritingDiary = () => {
    setIsWritingDiary(false);
    setEditingEntry(null);
    setDiaryForm({ title: '', content: '' });
  };

  const saveDiaryEntry = async () => {
    if (!diaryForm.title.trim() && !diaryForm.content.trim()) {
      alert("请填写内容");
      return;
    }

    try {
      const entryToSave: DiaryEntry = {
        id: editingEntry ? editingEntry.id : Date.now().toString(),
        title: diaryForm.title || "无标题日记",
        content: diaryForm.content,
        date: editingEntry ? editingEntry.date : new Date(),
        updatedAt: new Date()
      };

      await saveDiaryEntryToDB(entryToSave);
      await refreshData();
      setIsWritingDiary(false);
    } catch (e) {
      console.error("Failed to save diary", e);
      alert("保存失败");
    }
  };

  // Profile Handlers
  const startEditing = () => {
    setTempProfile(userProfile);
    setIsEditingProfile(true);
  };

  const saveProfile = () => {
    setUserProfile(tempProfile);
    saveProfileToStorage(tempProfile);
    setIsEditingProfile(false);
  };

  const cancelEditing = () => {
    setIsEditingProfile(false);
  };

  // Backup & Restore Handlers
  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `yuyu_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("备份失败");
    }
  };

  const handleImportClick = () => {
    backupFileInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("恢复数据将合并现有的照片和日记。确定要继续吗？")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const data = JSON.parse(jsonContent) as BackupData;
        await importAllData(data);
        if (data.profile) setUserProfile(data.profile);
        await refreshData();
        alert("数据恢复成功！");
      } catch (error) {
        console.error("Import failed:", error);
        alert("恢复失败，文件格式可能不正确");
      } finally {
        if (backupFileInputRef.current) {
          backupFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Cloud Config Handlers
  const handleSaveCloudConfig = () => {
    if (!cloudConfig.apiKey || !cloudConfig.projectId) {
      alert("请填写完整的配置信息");
      return;
    }
    saveCloudConfig(cloudConfig);
    setIsCloudActive(true);
    setShowCloudSetup(false);
    alert("云同步已开启！请重新登录以加载云端数据。");
    handleLogout(); 
  };

  const handleDisconnectCloud = () => {
    if (window.confirm("确定要断开云同步吗？将切换回本地数据。")) {
      removeCloudConfig();
      setIsCloudActive(false);
      setCloudConfig({ apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" });
      alert("已断开连接。");
      handleLogout();
    }
  };

  const handleEffectChange = (mode: ViewMode) => {
    setViewMode(mode);
    setIsEffectMenuOpen(false);
    
    // If tree selected, open immersive 3D
    if (mode === 'tree') {
      setShowInteractiveTree(true);
    }
  };

  // --- RENDERERS ---

  const renderLoginRequired = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in relative z-10">
      <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-500 shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-amber-900 mb-2">私密空间</h3>
      <p className="text-amber-700/70 mb-8">请先登录以查看照片和记录生活</p>
      <Button onClick={() => setActiveTab('profile')} className="w-full max-w-xs shadow-amber-200">
        去登录
      </Button>
    </div>
  );

  const renderHomeHeader = () => (
    <div className="px-6 pt-6 max-w-7xl mx-auto w-full flex justify-between items-end relative z-40">
      <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-lg">
        <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-1">主页</h2>
        <p className="text-amber-800/80 text-sm tracking-wide font-medium">
          {isCloudActive ? 'Cloud Gallery' : 'Local Gallery'}
        </p>
      </div>
      <div className="flex items-center space-x-3">
        {isCloudActive && (
          <span className="text-xs bg-blue-100/80 backdrop-blur-sm text-blue-800 px-2 py-1 rounded-full font-medium flex items-center shadow-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
            云端同步
          </span>
        )}
        
        {/* Settings Dropdown for Effects */}
        <div className="relative">
          <button 
            onClick={() => setIsEffectMenuOpen(!isEffectMenuOpen)}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-amber-200 shadow-sm flex items-center justify-center text-amber-600 hover:bg-white transition-all hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {isEffectMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-amber-100 py-1 z-50 animate-fade-in">
              <button onClick={() => handleEffectChange('grid')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${viewMode === 'grid' ? 'text-amber-600 font-bold bg-amber-50/50' : 'text-gray-700'}`}>
                📷 普通网格
              </button>
              <button onClick={() => handleEffectChange('spiral')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${viewMode === 'spiral' ? 'text-amber-600 font-bold bg-amber-50/50' : 'text-gray-700'}`}>
                🌀 环形旋转
              </button>
              <button onClick={() => handleEffectChange('tree')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${viewMode === 'tree' ? 'text-amber-600 font-bold bg-amber-50/50' : 'text-gray-700'}`}>
                🎄 3D 圣诞树
              </button>
              <button onClick={() => handleEffectChange('kaleidoscope')} className={`block w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${viewMode === 'kaleidoscope' ? 'text-amber-600 font-bold bg-amber-50/50' : 'text-gray-700'}`}>
                🌸 万花镜
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex-1 overflow-hidden flex flex-col relative h-full">
      {renderHomeHeader()}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-24 relative z-0">
        {!isLoggedIn ? (
          renderLoginRequired()
        ) : isLoadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-amber-800/50">
            <RabbitLogo className="w-16 h-16 mb-4 opacity-50" />
            <p>还没有照片哦，快去上传吧</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-10">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-amber-100 break-inside-avoid">
                <div className="relative aspect-square bg-amber-50">
                  <img 
                    src={post.imageUrl || post.image.previewUrl} 
                    alt="Post" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {post.description && (
                  <div className="p-4">
                    <p className="text-amber-900 text-sm leading-relaxed whitespace-pre-wrap font-serif-sc">{post.description}</p>
                    <p className="text-amber-400 text-xs mt-2">{new Date(post.date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 top-16">
            <GalleryViews posts={posts} mode={viewMode} />
          </div>
        )}
      </div>
    </div>
  );

  // ... (Other render functions: renderUpload, renderDiary, renderProfile remain same)
  // Re-paste them for completeness if needed or just assume they are part of the file update context 
  // But standard practice for this prompt style is to include the whole file if structure changes significantly.
  // I will include the rest of the render functions to be safe.

  const renderUpload = () => (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 relative z-10">
      <h2 className="text-3xl font-serif-sc font-bold text-amber-900 px-2 mb-8 text-center">记录美好</h2>
      
      {!isLoggedIn ? (
        renderLoginRequired()
      ) : (
        <div className="max-w-xl mx-auto bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-amber-100">
          {!image ? (
            <ImageUploader onImageSelected={handleImageSelected} />
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                <img src={image.previewUrl} alt="Preview" className="w-full h-auto" />
                <button 
                  onClick={handleResetUpload}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-amber-800">这一刻的想法...</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="写下你的心情..."
                  className="w-full p-4 rounded-xl border-amber-200 bg-white/80 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none h-32 text-amber-900 placeholder-amber-300"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleSavePost} 
                  isLoading={isSaving}
                  className="w-full py-3 text-lg"
                >
                  保存照片
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDiary = () => (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 relative z-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-3xl font-serif-sc font-bold text-amber-900">日记</h2>
          {isLoggedIn && !isWritingDiary && (
            <Button onClick={() => startWritingDiary()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </Button>
          )}
        </div>

        {!isLoggedIn ? (
          renderLoginRequired()
        ) : isWritingDiary ? (
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-amber-100 animate-fade-in">
             <input
               type="text"
               value={diaryForm.title}
               onChange={(e) => setDiaryForm({...diaryForm, title: e.target.value})}
               placeholder="标题"
               className="w-full text-xl font-bold text-amber-900 bg-transparent border-b border-amber-200 pb-2 mb-4 focus:outline-none focus:border-amber-500 placeholder-amber-300"
             />
             <textarea
               value={diaryForm.content}
               onChange={(e) => setDiaryForm({...diaryForm, content: e.target.value})}
               placeholder="今天发生了什么..."
               className="w-full h-64 bg-transparent resize-none text-amber-900 leading-relaxed focus:outline-none placeholder-amber-300 custom-scrollbar"
             />
             <div className="flex justify-end gap-3 mt-4">
               <Button variant="ghost" onClick={cancelWritingDiary}>取消</Button>
               <Button onClick={saveDiaryEntry}>保存</Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            {diaryEntries.length === 0 ? (
              <div className="text-center py-12 text-amber-800/50">
                <p>还没有日记，记录下今天吧</p>
              </div>
            ) : (
              diaryEntries.map(entry => (
                <div key={entry.id} className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-amber-100 hover:shadow-md transition-shadow group relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-amber-900">{entry.title}</h3>
                    <span className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-amber-800/80 line-clamp-3 leading-relaxed whitespace-pre-wrap text-sm">{entry.content}</p>
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                      onClick={() => startWritingDiary(entry)}
                      className="text-amber-400 hover:text-amber-600 p-1 bg-white rounded-md shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      onClick={async () => {
                        if(confirm('确定要删除这篇日记吗？')) {
                          await deleteDiaryEntryFromDB(entry.id);
                          await refreshData();
                        }
                      }}
                      className="text-red-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex-1 overflow-y-auto px-6 pt-10 pb-24 relative z-10">
      <div className="max-w-md mx-auto">
        {!isLoggedIn ? (
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-amber-100 animate-fade-in">
            <h2 className="text-2xl font-bold text-amber-900 mb-6 text-center">登录</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-1">账号</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white/50"
                  placeholder="请输入账号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-1">密码</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white/50"
                  placeholder="请输入密码"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <Button type="submit" className="w-full py-2.5 mt-2">进入我的空间</Button>
            </form>
          </div>
        ) : showCloudSetup ? (
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-amber-100 animate-fade-in">
            <h3 className="text-xl font-bold text-amber-900 mb-4">云同步设置</h3>
            <p className="text-sm text-amber-700 mb-4 bg-amber-50 p-3 rounded-lg">
              配置 Firebase 以在多台设备间同步数据。你需要创建一个 Firebase 项目并启用 Firestore 和 Storage。
            </p>
            <div className="space-y-3">
              <input type="text" placeholder="API Key" className="w-full p-2 rounded border border-amber-200 text-sm" value={cloudConfig.apiKey} onChange={e => setCloudConfig({...cloudConfig, apiKey: e.target.value})} />
              <input type="text" placeholder="Auth Domain" className="w-full p-2 rounded border border-amber-200 text-sm" value={cloudConfig.authDomain} onChange={e => setCloudConfig({...cloudConfig, authDomain: e.target.value})} />
              <input type="text" placeholder="Project ID" className="w-full p-2 rounded border border-amber-200 text-sm" value={cloudConfig.projectId} onChange={e => setCloudConfig({...cloudConfig, projectId: e.target.value})} />
              <input type="text" placeholder="Storage Bucket" className="w-full p-2 rounded border border-amber-200 text-sm" value={cloudConfig.storageBucket} onChange={e => setCloudConfig({...cloudConfig, storageBucket: e.target.value})} />
              <input type="text" placeholder="App ID" className="w-full p-2 rounded border border-amber-200 text-sm" value={cloudConfig.appId} onChange={e => setCloudConfig({...cloudConfig, appId: e.target.value})} />
              
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowCloudSetup(false)} className="flex-1">取消</Button>
                <Button onClick={handleSaveCloudConfig} className="flex-1">保存并连接</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* User Info Card */}
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-amber-100 flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-200 to-orange-100 p-1 mb-4 shadow-md">
                 <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <RabbitLogo className="w-16 h-16 text-amber-400" />
                 </div>
              </div>
              
              {isEditingProfile ? (
                <div className="w-full space-y-3">
                  <input
                    type="text"
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                    className="w-full text-center font-bold text-xl border-b border-amber-300 bg-transparent focus:outline-none text-amber-900"
                    placeholder="昵称"
                  />
                  <textarea
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                    className="w-full text-center text-sm text-amber-800/80 bg-white/50 rounded-lg p-2 border border-amber-100 focus:outline-none resize-none"
                    rows={4}
                    placeholder="个性签名"
                  />
                  <div className="flex justify-center gap-2 mt-2">
                    <Button variant="secondary" onClick={cancelEditing} className="px-3 py-1 text-sm h-8">取消</Button>
                    <Button onClick={saveProfile} className="px-3 py-1 text-sm h-8">保存</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-amber-900 mb-2">{userProfile.name}</h2>
                  <p className="text-amber-800/70 text-sm leading-relaxed max-w-xs font-serif-sc">{userProfile.bio}</p>
                  <button 
                    onClick={startEditing}
                    className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Function List */}
            <div className="space-y-3">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-amber-100">
                <h3 className="font-bold text-amber-900 mb-3 text-sm uppercase tracking-wider">数据管理</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleExportData}
                    className="flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="text-xs font-medium text-amber-800">备份数据</span>
                  </button>
                  
                  <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-xs font-medium text-amber-800">恢复数据</span>
                  </button>
                  <input type="file" ref={backupFileInputRef} onChange={handleImportFileChange} className="hidden" accept=".json" />
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-amber-100">
                 <h3 className="font-bold text-amber-900 mb-3 text-sm uppercase tracking-wider">云端同步</h3>
                 {isCloudActive ? (
                   <div className="flex justify-between items-center">
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        已连接到云端
                      </div>
                      <button onClick={handleDisconnectCloud} className="text-xs text-red-500 hover:text-red-700 underline">断开连接</button>
                   </div>
                 ) : (
                   <Button variant="secondary" onClick={() => setShowCloudSetup(true)} className="w-full text-sm">
                     配置云同步
                   </Button>
                 )}
              </div>
              
              <Button onClick={handleLogout} variant="danger" className="w-full shadow-red-200">
                退出登录
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const navItems = [
    { id: 'home', label: '主页', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'diary', label: '日记', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )},
    { id: 'upload', label: '上传', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )},
    { id: 'profile', label: '我的', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )}
  ];

  return (
    <div className="h-screen w-screen bg-[#FFF8E1] flex md:flex-row flex-col overflow-hidden">
      {/* BACKGROUND DECORATIONS (Global) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-orange-200/20 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-amber-200/20 rounded-full blur-[100px]"></div>
      </div>

      {/* IMMERSIVE 3D OVERLAY */}
      {showInteractiveTree && (
        <InteractiveTree 
          posts={posts} 
          onClose={() => {
            setShowInteractiveTree(false);
            setViewMode('grid'); // Reset to grid on close
          }} 
        />
      )}

      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex flex-col w-64 bg-white/40 backdrop-blur-xl border-r border-amber-100/50 shadow-lg z-50 h-full p-6">
         <div className="flex items-center gap-3 mb-10 pl-2">
            <RabbitLogo className="w-10 h-10 text-amber-500" />
            <h1 className="text-2xl font-serif-sc font-bold text-amber-900 tracking-wider">余余</h1>
         </div>
         
         <div className="flex flex-col gap-2 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group
                  ${activeTab === item.id 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 transform scale-105' 
                    : 'text-amber-800 hover:bg-amber-100/50 hover:pl-5'
                  }`}
              >
                <div className={`${activeTab === item.id ? 'text-white' : 'text-amber-600 group-hover:text-amber-700'}`}>
                  {item.icon}
                </div>
                <span className="font-medium text-lg tracking-wide">{item.label}</span>
              </button>
            ))}
         </div>

         {isLoggedIn && (
           <div className="mt-auto pt-6 border-t border-amber-200/30">
              <div className="flex items-center gap-3 px-2">
                 <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="font-bold text-amber-600 text-lg">{userProfile.name[0]}</span>
                 </div>
                 <div>
                    <p className="font-bold text-amber-900 text-sm">{userProfile.name}</p>
                    <p className="text-xs text-amber-600">在线</p>
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 h-full w-full relative flex flex-col z-10">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'diary' && renderDiary()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-amber-100 pb-safe pt-2 px-6 shadow-[0_-5px_20px_rgba(251,191,36,0.1)] z-40">
        <div className="flex justify-between items-center h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center justify-center w-12 transition-all duration-300
                ${activeTab === item.id ? 'transform -translate-y-2' : ''}
              `}
            >
              <div 
                className={`
                  p-2 rounded-2xl transition-all duration-300
                  ${activeTab === item.id 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                    : 'text-amber-400 hover:text-amber-600 bg-transparent'
                  }
                `}
              >
                {/* Clone element to change size safely if needed, or just use wrapper class */}
                <div className="w-6 h-6">{item.icon}</div>
              </div>
              <span 
                className={`text-[10px] font-medium mt-1 transition-opacity duration-300
                  ${activeTab === item.id ? 'text-amber-800 opacity-100' : 'opacity-0 h-0 overflow-hidden'}
                `}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;