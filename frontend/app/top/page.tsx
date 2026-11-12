"use client";

import { useEffect, useState } from "react";

interface Memo{
    createdAt: string,
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

    const [memoHistory, setMemoHistory] = useState<Memo[]>([])

    const [editingId, setEditingId] = useState<string|null>(null)

    const showMemoHistory = async() => {
        const res = await fetch('http://localhost:8000/api/top', {
            cache: 'no-store'
        });
        if(!res.ok) throw new Error('メモ履歴取得できませんでした');
        const json: { data: Memo[]} = await res.json();

        const sortedData = json.data.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        });
        setMemoHistory(sortedData)
    }

    const handleSave = async () => {
        if(!memoData.title.trim() && !memoData.content.trim()){
            alert("未入力のため、保存できません")
            return;
        }
        const response = await fetch('http://localhost:8000/api/top', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memoData),
        });

        await showMemoHistory()

        if(response.ok) setMemoData({title: "", content: ""});
    }

    const handleDelete = async (id: string) => {
        const response = await fetch (`http://localhost:8000/api/top/${id}`, {
            method: 'DELETE',
        });
        await showMemoHistory()
    }

    const handleUpdate = async (id: string) => {
        if(!editingMemoData.title.trim() && !editingMemoData.content.trim()){
            alert("未入力のため、保存できません")
            return;
        }

        const response = await fetch(`http://localhost:8000/api/top/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(editingMemoData),
        });
        if(response.ok) setEditingId(null)
        await showMemoHistory()
    }

    useEffect(() => {
        showMemoHistory()
        setEditingId(null)
    }, [])

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
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
                                    <span className="text-xs text-gray-400">{memo.createdAt}</span>
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