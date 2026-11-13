"use client";

import { useEffect, useState } from "react";

const API_URL = 'http://localhost:8000/api/top/'

interface Memo{
    updatedAt: string,
    id: string,
    title: string,
    content: string,
}

export default function TopPage(){

    const [memoData, setMemoData] = useState({
        title: '',
        content: '',
    })

    const [editingMemoData, setEditingMemoData] = useState({
        title: '',
        content: '',
    })

    const [errorMessage, setErrorMessage] = useState<string|null>(null)

    const [memoHistory, setMemoHistory] = useState<Memo[]>([])

    const [editingId, setEditingId] = useState<string|null>(null)

    const [countMemo, setCountMemo] = useState<number|null>(null)

    const showMemoHistory = async() => {

        try{setErrorMessage(null)
            setCountMemo(null)
            const res = await fetch(API_URL, {
                cache: 'no-store'
            });
            if(!res.ok) throw new Error('メモ履歴取得できませんでした');
            const json: { data?: Memo[]} = await res.json();
            const sortedData = (json.data || []).sort((a, b) => {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            });
            setCountMemo(sortedData.length)
            setMemoHistory(sortedData)
        }catch(e){
            console.error(e)
            setErrorMessage('メモ履歴の取得が失敗しました')
        }
    }

    const handleSave = async () => {
        setErrorMessage(null)
        if(!memoData.title.trim() && !memoData.content.trim()){
            setErrorMessage('未入力のため、保存できません')
            return;
        }
        try{const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify(memoData),
            });
            if(!response.ok) throw new Error('メモの保存が失敗しました')

            await showMemoHistory()

            setMemoData({title: "", content: ""});
        }catch(e){
            console.error(e);
            setErrorMessage('メモの保存が失敗しました')
        }
    }

    const handleDelete = async (id: string) => {
        try{setErrorMessage(null)
            if(!window.confirm("メモ削除でよろしいですか？")) return;
            const response = await fetch (`${API_URL}${id}`, {
                method: 'DELETE',
            });
            if(!response.ok) throw new Error('メモ削除できませんでした')
            await showMemoHistory()
        }catch(e){
            console.error(e);
            setErrorMessage('メモ削除できませんでした');
        }
    }

    const handleUpdate = async (id: string) => {
        setErrorMessage(null)
        if(!editingMemoData.title.trim() && !editingMemoData.content.trim()){
            setErrorMessage('未入力のため、保存できません')
            return;
        }
        try{
            const response = await fetch(`${API_URL}${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editingMemoData),
            });
            setEditingId(null)
            if(!response.ok) throw new Error('編集した内容の保存ができませんでした')
            await showMemoHistory()
        }catch(e){
            console.error(e);
            setErrorMessage('編集した内容の保存ができませんでした')
        }
    }

    useEffect(() => {
        showMemoHistory()
        setEditingId(null)
    }, [])

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
            {errorMessage===null ? (null):(<p className="mb-4 text-sm text-red-500">{errorMessage}</p>)}
            <div>
                <input
                type="text"
                value={memoData.title}
                onChange={(e) => setMemoData({...memoData, title: e.target.value})}
                placeholder="タイトル..."
                className="w-full px-4 py-2 text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-400"
                />
            </div>

            <div>
                <textarea
                value={memoData.content}
                onChange={(e) => setMemoData({...memoData, content: e.target.value})}
                placeholder="メモ..."
                rows={8}
                className="w-full px-4 py-3 text-sm text-gray-800 dark:text-gray-200 bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y transition-all placeholder:text-gray-400 leading-relaxed"
                />
            </div>

            <div className="flex justify-end pt-2">
                <button
                onClick={(handleSave)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                保存
                </button>
            </div>
            
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">メモ履歴</h3>
                <div className="space-y-3">
                    {countMemo===0 ? (<p>まだ何も書かれていません</p>):(null)}
                    {memoHistory.map((memo) => (
                        <div key={memo.id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-1 relative">
                            {editingId === memo.id ? (
                                <>
                                    <input type="text" 
                                           value={editingMemoData.title} 
                                           onChange={(e) => setEditingMemoData({...editingMemoData, title: e.target.value})}
                                           className="w-full px-4 py-2 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                    <textarea value={editingMemoData.content} 
                                              className="w-full px-4 py-3 mb-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y transition-all placeholder:text-gray-400 leading-relaxed"
                                              onChange={(e) => setEditingMemoData({...editingMemoData, content: e.target.value})}
                                    />
                                    <button
                                    onClick={() => {setEditingId(null)}}
                                    className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 absolute bottom-2 right-4 text-xs"
                                    >
                                    キャンセル
                                    </button>
                                    <button
                                    onClick={() => {handleUpdate(memo.id)}}
                                    className="px-1 py-0.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 absolute top-3 right-4 text-xs"
                                    >
                                    保存
                                    </button>
                                </>                            
                            ) : (
                                <>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{memo.title || "（NO TITLE)"}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{memo.content || " (NO CONTENT) "}</p>
                                    <span className="text-xs text-gray-400">{memo.updatedAt}</span>
                                    <button
                                    onClick={() => handleDelete(memo.id)}
                                    className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 absolute bottom-4 right-4 text-xs"
                                    >
                                    削除
                                    </button>
                                    <button
                                    onClick={() => {setEditingId(memo.id); setEditingMemoData({title: memo.title, content: memo.content})}}
                                    className="px-1 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 absolute top-4 right-4 text-xs"
                                    >
                                    編集
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}