import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { ImageFile, Post, Tab, DiaryEntry } from './types';
import { RabbitLogo } from './components/RabbitLogo';
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
  BackupData
} from './services/storage';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Auth State
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

  // Initial Data Load
  useEffect(() => {
    // Check session login
    const sessionAuth = sessionStorage.getItem('yuyu_auth');
    if (sessionAuth === 'true') {
      setIsLoggedIn(true);
    }

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Load Profile
        const loadedProfile = getProfileFromStorage();
        if (loadedProfile) {
          setUserProfile(loadedProfile);
        }

        // We only load sensitive data if logged in
        if (sessionAuth === 'true') {
          const loadedPosts = await getPostsFromDB();
          setPosts(loadedPosts);
          const loadedDiary = await getDiaryEntriesFromDB();
          setDiaryEntries(loadedDiary);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Effect to load secure data when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchSecureData = async () => {
        setIsLoadingData(true);
        try {
          const loadedPosts = await getPostsFromDB();
          setPosts(loadedPosts);
          const loadedDiary = await getDiaryEntriesFromDB();
          setDiaryEntries(loadedDiary);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchSecureData();
    }
  }, [isLoggedIn]);

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'yuyu' && loginForm.password === '1009') {
      setIsLoggedIn(true);
      sessionStorage.setItem('yuyu_auth', 'true');
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('yuyu_auth');
    setPosts([]); // Clear sensitive data from memory
    setDiaryEntries([]);
    setActiveTab('profile'); // Return to login screen
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
        const newPost: Post = {
          id: Date.now().toString(),
          image: image,
          description: note,
          date: new Date()
        };

        await savePostToDB(newPost);
        setPosts(prevPosts => [newPost, ...prevPosts]);
        setImage(null);
        setNote("");
        setActiveTab('home');
      } catch (error) {
        console.error("Failed to save post", error);
        alert("保存失败，请重试");
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
      
      if (editingEntry) {
        setDiaryEntries(prev => prev.map(e => e.id === entryToSave.id ? entryToSave : e));
      } else {
        setDiaryEntries(prev => [entryToSave, ...prev]);
      }

      setIsWritingDiary(false);
    } catch (e) {
      console.error("Failed to save diary", e);
      alert("保存失败");
    }
  };

  const handleDeleteDiary = async (id: string) => {
    if (window.confirm("确定要删除这篇日记吗？")) {
      try {
        await deleteDiaryEntryFromDB(id);
        setDiaryEntries(prev => prev.filter(e => e.id !== id));
        if (editingEntry?.id === id) {
          setIsWritingDiary(false);
        }
      } catch (e) {
        console.error("Failed to delete", e);
      }
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
        
        // Refresh UI
        if (data.profile) setUserProfile(data.profile);
        
        const loadedPosts = await getPostsFromDB();
        setPosts(loadedPosts);
        
        const loadedDiary = await getDiaryEntriesFromDB();
        setDiaryEntries(loadedDiary);
        
        alert("数据恢复成功！");
      } catch (error) {
        console.error("Import failed:", error);
        alert("恢复失败，文件格式可能不正确");
      } finally {
        // Reset file input
        if (backupFileInputRef.current) {
          backupFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // --- RENDERERS ---

  const renderLoginRequired = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
      <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-500">
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

  const renderHome = () => {
    if (!isLoggedIn) return renderLoginRequired();

    return (
      <div className="space-y-6 pb-24">
        <div className="px-6 pt-6 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-1">主页</h2>
          <p className="text-amber-700/60 text-sm tracking-wide">Gallery of Moments</p>
        </div>
        
        {isLoadingData ? (
           <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-pulse">
             <div className="w-16 h-16 bg-amber-100 rounded-full mb-4"></div>
             <div className="h-4 bg-amber-100 rounded w-32 mb-2"></div>
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
  };

  const renderDiary = () => {
    if (!isLoggedIn) return renderLoginRequired();

    if (isWritingDiary) {
      return (
        <div className="h-full flex flex-col pb-24 px-4 pt-6 max-w-3xl mx-auto w-full animate-slide-up">
           <div className="flex justify-between items-center mb-6">
             <button onClick={cancelWritingDiary} className="text-amber-600 font-medium text-sm flex items-center hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
               返回
             </button>
             <h2 className="text-xl font-bold text-amber-900">{editingEntry ? '编辑日记' : '新日记'}</h2>
             <Button onClick={saveDiaryEntry} className="shadow-amber-200 text-sm py-1.5 px-4">保存</Button>
           </div>
           
           <div className="bg-white rounded-2xl shadow-sm border border-amber-100 flex-1 flex flex-col overflow-hidden">
             <input 
               type="text" 
               placeholder="标题..."
               value={diaryForm.title}
               onChange={(e) => setDiaryForm({...diaryForm, title: e.target.value})}
               className="w-full px-6 py-4 text-xl font-bold text-amber-900 placeholder-amber-300 border-b border-amber-100 focus:outline-none bg-transparent"
             />
             <textarea 
               placeholder="写下今天的故事..."
               value={diaryForm.content}
               onChange={(e) => setDiaryForm({...diaryForm, content: e.target.value})}
               className="w-full flex-1 px-6 py-4 text-amber-800 leading-relaxed resize-none focus:outline-none bg-transparent custom-scrollbar"
             />
             <div className="px-4 py-2 bg-amber-50 text-right text-xs text-amber-400">
               {editingEntry ? `最后修改: ${editingEntry.updatedAt.toLocaleString()}` : new Date().toLocaleDateString()}
             </div>
           </div>
           
           {editingEntry && (
             <div className="mt-4 text-center">
               <button onClick={() => handleDeleteDiary(editingEntry.id)} className="text-red-400 text-sm hover:text-red-600 transition-colors">删除这篇日记</button>
             </div>
           )}
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24 h-full relative">
        <div className="px-6 pt-6 sticky top-14 bg-[#FFF8E1]/95 z-20 backdrop-blur-sm pb-4 border-b border-amber-100/50 max-w-3xl mx-auto w-full flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-serif-sc font-bold text-amber-900 mb-1">日记</h2>
            <p className="text-amber-700/60 text-sm tracking-wide">My Stories</p>
          </div>
          <button 
            onClick={() => startWritingDiary()} 
            className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {isLoadingData ? (
           <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-12 h-12 bg-amber-100 rounded-full mb-3"></div>
              <div className="h-4 bg-amber-50 w-32 rounded"></div>
           </div>
        ) : diaryEntries.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-xl rotate-3 flex items-center justify-center mb-4 text-amber-400 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <p className="text-amber-700 font-medium">还没有日记</p>
            <p className="text-amber-500/60 text-sm mt-1 mb-6">写下你的第一篇心事吧</p>
            <Button onClick={() => startWritingDiary()} variant="secondary" className="border-amber-300">
              写日记
            </Button>
          </div>
        ) : (
          <div className="px-4 max-w-3xl mx-auto w-full grid gap-4">
            {diaryEntries.map((entry) => (
              <div 
                key={entry.id} 
                onClick={() => startWritingDiary(entry)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-amber-900 group-hover:text-amber-600 transition-colors line-clamp-1">{entry.title}</h3>
                  <span className="text-xs text-amber-400 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap ml-2">
                    {entry.date.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-amber-800/80 text-sm line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUpload = () => {
    if (!isLoggedIn) return renderLoginRequired();

    return (
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
                  onClick={handleResetUpload}
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
  };

  const renderProfile = () => {
    // Login Screen
    if (!isLoggedIn) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 pb-20 max-w-sm mx-auto w-full animate-fade-in">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-amber-200 mb-8">
              <RabbitLogo className="w-12 h-12 text-amber-500" />
           </div>
           
           <h2 className="text-2xl font-serif-sc font-bold text-amber-900 mb-8">欢迎回来，余余</h2>
           
           <form onSubmit={handleLogin} className="w-full space-y-4">
             <div>
               <label className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 ml-1">账号</label>
               <input 
                 type="text" 
                 value={loginForm.username}
                 onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                 className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm transition-all focus:border-amber-400"
                 placeholder="请输入账号"
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 ml-1">密码</label>
               <input 
                 type="password" 
                 value={loginForm.password}
                 onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                 className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm transition-all focus:border-amber-400"
                 placeholder="请输入密码"
               />
             </div>
             
             {loginError && (
               <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">{loginError}</div>
             )}
             
             <Button type="submit" className="w-full py-3 mt-4 text-lg shadow-amber-200">
               登录
             </Button>
           </form>
           
           <p className="mt-8 text-amber-400 text-xs text-center">
             始于心动，终于白首
           </p>
        </div>
      );
    }

    // Profile Screen (Authenticated)
    return (
      <div className="flex flex-col items-center justify-center h-full pb-24 space-y-6 relative overflow-hidden overflow-y-auto">
        {/* Background decoration */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-amber-100 to-transparent -z-10"></div>
        
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-xl shadow-amber-200 border-4 border-white mt-10 shrink-0">
           <RabbitLogo className="w-14 h-14 text-amber-500" />
        </div>
        
        <div className="text-center w-full max-w-xs mx-auto z-10 shrink-0">
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
        
        <div className="w-full max-w-sm px-6 space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                <span className="text-amber-900 font-bold text-xl">{posts.length}</span>
                <span className="text-amber-600/70 text-xs font-medium uppercase mt-1">照片</span>
             </div>
             <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                <span className="text-amber-900 font-bold text-xl">{diaryEntries.length}</span>
                <span className="text-amber-600/70 text-xs font-medium uppercase mt-1">日记</span>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 space-y-3">
             <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">数据管理</h3>
             <div className="grid grid-cols-2 gap-3">
               <button onClick={handleExportData} className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-xs text-amber-800 font-medium">备份数据</span>
               </button>
               <button onClick={handleImportClick} className="flex flex-col items-center justify-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-xs text-amber-800 font-medium">恢复数据</span>
               </button>
               {/* Hidden Input for File Upload */}
               <input 
                  type="file" 
                  ref={backupFileInputRef} 
                  onChange={handleImportFileChange} 
                  accept=".json" 
                  className="hidden" 
               />
             </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full py-3 text-amber-600 font-medium hover:bg-amber-50 rounded-xl transition-colors border border-dashed border-amber-200"
          >
            退出登录
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-amber-900 font-sans selection:bg-amber-200 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FFF8E1]/90 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <RabbitLogo className="w-8 h-8 text-amber-500" />
          <span className="text-xl font-serif-sc font-bold tracking-wide text-amber-900">余余</span>
        </div>
        {isLoggedIn && (
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'diary' && renderDiary()}
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
            active={activeTab === 'diary'} 
            onClick={() => setActiveTab('diary')} 
            label="日记"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
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