"use client";

import { useEffect, useState, useRef, memo } from "react";

// APIのエンドポイント
const API_URL = 'http://localhost:8000/api/top/'

// メモデータの型定義
interface Memo{
    updatedAt: string,
    id: string,
    title: string,
    content: string,
}

export default function TopPage(){
    // 新規作成用の入力状態
    const [memoData, setMemoData] = useState({
        title: '',
        content: '',
    })

    // 編集中の入力状態
    const [editingMemoData, setEditingMemoData] = useState({
        title: '',
        content: '',
    })

    // エラーメッセージ
    const [errorMessage, setErrorMessage] = useState<string|null>(null)

    // 全メモのリスト
    const [allMemos, setAllMemos] = useState<Memo[]>([])

    // 編集中のメモID（編集中でない場合はnull）
    const [editingId, setEditingId] = useState<string|null>(null)

    // 検索キーワード
    const [keyword, setKeyword] = useState("")

    // メモ一覧の取得（更新日時の新しい順にソート）
    const fetchMemos = async() => {
        try{
            const res = await fetch(API_URL, {
                cache: 'no-store'
            });
            if(!res.ok) throw new Error('メモ履歴取得できませんでした');
            const json: { data?: Memo[]} = await res.json();
            const sortedData = (json.data || []).sort((a, b) => {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            });
            setAllMemos(sortedData)
        }catch(e){
            console.error(e)
            setErrorMessage('メモ履歴の取得が失敗しました')
        }
    }

    // 検索キーワードによるメモの絞り込み（タイトルまたは本文に含まれるか判定）
    const filtedMemos = allMemos.filter((item) => {
        const keywordToLow = keyword.toLowerCase()
        if(!keywordToLow || !keywordToLow.trim()) {
            return true;
        }
        return (item.title.toLowerCase().includes(keywordToLow) || 
            item.content.toLowerCase().includes(keywordToLow));
    })

    // 新規メモの保存処理
    const handleSave = async () => {
        // エディタ内のHTMLコンテンツを取得
        const currentContent = editorRef.current?.innerHTML || "";
        setErrorMessage(null)
        if(!memoData.title.trim() && !currentContent.trim()){
            setErrorMessage('未入力のため、保存できません')
            return;
        }
        try{
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: memoData.title,
                    content: currentContent
                }),
            });
            if(!response.ok) throw new Error('メモの保存が失敗しました')
            await fetchMemos()
            setMemoData({title: "", content: ""});
            // 保存成功後にエディタの入力をクリア
            if(editorRef.current){
                editorRef.current.innerHTML = "";
            }
        }catch(e){
            console.error(e);
            setErrorMessage('メモの保存が失敗しました')
        }
    }

    // メモの削除処理
    const handleDelete = async (id: string) => {
        try{
            setErrorMessage(null)
            if(!window.confirm("メモ削除でよろしいですか？")) return;
            const response = await fetch (`${API_URL}${id}`, {
                method: 'DELETE',
            });
            if(!response.ok) throw new Error('メモ削除できませんでした')
            fetchMemos()
        }catch(e){
            console.error(e);
            setErrorMessage('メモ削除できませんでした');
        }
    }

    // メモの更新（編集内容の保存）
    const handleUpdate = async (id: string) => {
        // 編集用エディタ内のHTMLコンテンツを取得
        const currentContent = editorHistoryRef.current?.innerHTML || ""
        setErrorMessage(null)
        if(!editingMemoData.title.trim() && !currentContent.trim()){
            setErrorMessage('未入力のため、保存できません')
            return;
        }
        try{
            const response = await fetch(`${API_URL}${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: editingMemoData.title,
                    content: currentContent,
                }),
            });
            if(!response.ok) throw new Error('編集した内容の保存ができませんでした')
            await fetchMemos()
            setEditingId(null)
        }catch(e){
            console.error(e);
            setErrorMessage('編集した内容の保存ができませんでした')
        }
    }

    // エディタおよびファイル入力用の参照（DOM参照）
    const editorRef = useRef<HTMLDivElement>(null);
    const editorHistoryRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileHistoryInputRef = useRef<HTMLInputElement>(null);

    // エディタへファイル（画像または添付リンク）を挿入する処理
    const insertFileToEditer = (
        file: File,
        targetRef: React.RefObject<HTMLDivElement | null>,
        asImage: boolean,
    ) => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const result = loadEvent.target?.result;
            const editor = targetRef.current;
            if(typeof result != "string" || !editor) return;

            let nodeToInsert: HTMLElement;

            if(file.type.startsWith("image/") && asImage){
                // 貼り付け画像の場合はimg要素として生成
                const img = document.createElement("img");
                img.src = result;
                img.className = "inline-block max-h-48 my-2 mr-2 rounded-lg border border-gray-200 dark:border-gray-700 align-top";
                nodeToInsert = img;
            } else {
                // その他のファイルはダウンロード用リンクとして生成
                const link = document.createElement("a")
                link.href = result;
                link.download = file.name;
                link.contentEditable = "false";
                link.textContent = `📎 ${file.name}`;
                link.className = "inline-flex items-center gap-1 px-2.5 py-1 my-1 mr-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 cursor-pointer";
                nodeToInsert = link;
            }
            // カーソル選択位置がある場合はそこに挿入、なければ末尾に追加
            const selection = window.getSelection();
            if(selection && selection.rangeCount > 0){
                const range = selection.getRangeAt(0);
                if(editor.contains(range.commonAncestorContainer)){
                    range.deleteContents();
                    range.insertNode(nodeToInsert);

                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return;
                }
            }
            editor.appendChild(nodeToInsert);
        };
        reader.readAsDataURL(file);
    };

    // ファイル選択時のハンドラー（複数ファイルの添付に対応）
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
        const files = e.target.files;
        if(!files || files.length === 0) return;

        for(const file of Array.from(files)){
            insertFileToEditer(file, targetRef, false);
        }
    }

    // クリップボードからの画像貼り付け（ペースト）ハンドラー
    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
        const items = event.clipboardData?.items;
        if(!items) return;

        for(const item of items){
            if(item.type.startsWith("image/")){
                const file = item.getAsFile();
                if(!file) continue;
                event.preventDefault();
                insertFileToEditer(file, targetRef, true)
                break;
            }
        }
    };

    // 初回レンダリング時にメモ一覧を取得
    useEffect(() => {
        fetchMemos()
    }, [])

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
            {/* エラーメッセージ表示 */}
            {errorMessage===null ? (null):(<p className="mb-4 text-sm text-red-500">{errorMessage}</p>)}
            
            {/* 新規メモ入力欄：タイトル */}
            <div>
                <input
                type="text"
                value={memoData.title}
                onChange={(e) => setMemoData({...memoData, title: e.target.value})}
                placeholder="タイトル..."
                className="w-full px-4 py-2 text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-400"
                />
            </div>

            {/* 新規メモ入力欄：リッチテキストエディタ（contentEditable） */}
            <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setMemoData({...memoData, content: e.currentTarget.innerHTML})}
                onPaste={(e) => handlePaste(e, editorRef)}
                data-placeholder="メモ..."
                className="w-full min-h-[200px] px-4 py-3 text-sm text-gray-800 dark:text-gray-200 bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
                >
            </div>

            {/* 新規メモ保存・ファイル添付エリア */}
            <div className="flex justify-between pt-2 items-center">
                <div>
                    {/* 非表示のファイル選択inputと添付トリガーボタン */}
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, editorRef)}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
                    >
                    📎 ファイル添付
                    </button>
                </div>

                {/* 新規メモ保存ボタン */}
                <button
                onClick={(handleSave)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                保存
                </button>
            </div>
            
            {/* メモ履歴一覧エリア */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
                <div className="flex items-center justify-between gap-4 mb-4" >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">メモ履歴</h3>
                    {/* メモ検索入力欄 */}
                    <input
                        type="text"
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="検索..."
                        className="w-44 sm:w-64 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="space-y-3">
                    {/* 件数に応じたメッセージ表示 */}
                    {allMemos.length===0 ? (<p>まだ何も書かれていません</p>):(filtedMemos.length===0) ? (<p>検索結果はありません</p>):(null)}
                    
                    {/* メモ一覧の描画 */}
                    {filtedMemos.map((memo) => (
                        <div key={memo.id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-1 relative">
                            {editingId === memo.id ? (
                                /* 編集モード */
                                <>
                                    <input type="text" 
                                           value={editingMemoData.title} 
                                           onChange={(e) => setEditingMemoData({...editingMemoData, title: e.target.value})}
                                           className="w-full px-4 py-2 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                    {/* 編集用リッチテキストエディタ */}
                                    <div
                                        ref={editorHistoryRef}
                                        defaultValue={editingMemoData.content}
                                        contentEditable
                                        onPaste={(e) => handlePaste(e, editorHistoryRef)}
                                        className="w-full px-4 py-3 mb-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y transition-all placeholder:text-gray-400 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: editingMemoData.content }}
                                        >
                                    </div>
                                    {/* ファイル添付・キャンセルボタンエリア */}
                                    <div className="flex justify-between pt-2 items-center">
                                        <button
                                            type="button"
                                            onClick={() => fileHistoryInputRef.current?.click()}
                                            className="px-1 py-0.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors left"
                                        >
                                            📎 ファイル添付
                                        </button> 
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileHistoryInputRef}
                                            onChange={(e) => handleFileChange(e, editorHistoryRef)}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => {setEditingId(null)}}
                                            className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-xs"
                                        >
                                            キャンセル
                                        </button>                                   
                                    </div>
                                    {/* 編集内容保存ボタン */}
                                    <button
                                        onClick={() => {handleUpdate(memo.id)}}
                                        className="px-1 py-0.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 absolute top-3 right-4 text-xs"
                                    >
                                        保存
                                    </button>
                                </>                            
                            ) : (
                                /* 通常表示モード */
                                <>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{memo.title || "（NO TITLE)"}</h4>
                                    {/* メモ本文（HTML描画：画像や添付ファイルリンク対応） */}
                                    <div 
                                         className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap" 
                                         dangerouslySetInnerHTML={{ __html: memo.content || " (NO CONTENT) " }}
                                    />
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
