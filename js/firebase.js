// 1. Firebaseの機能をウェブ上から読み込む（インポート）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, doc, setDoc, updateDoc, query, orderBy, limit, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ----------------------------------------------------------------
// 2. あなたのFirebase設定（ここを自分のものに書き換える！）
// ----------------------------------------------------------------
// ★Firebaseコンソールの「プロジェクト設定」＞「マイアプリ」にある内容をコピペしてください
const firebaseConfig = {
  apiKey: "AIzaSyBNSnCQGPsDPqLS2K9wqDR7mxCpzedI0WM",
  authDomain: "kajimoto-official-line-site.firebaseapp.com",
  projectId: "kajimoto-official-line-site",
  storageBucket: "kajimoto-official-line-site.firebasestorage.app",
  messagingSenderId: "985647612590",
  appId: "1:985647612590:web:f1b4184601d17a93aa233f",
  measurementId: "G-KNK64JS15W"
};

// 3. Firebaseを起動する
const app = initializeApp(firebaseConfig);

// 4. データベース機能を使えるように準備する
const db = getFirestore(app);

// 5. ほかのファイル（ゲームのHTMLなど）でも使えるように機能を配る（エクスポート）
export { 
    db, 
    collection, 
    addDoc,      // データを追加する（ID自動生成）
    setDoc,      // IDを指定してデータを保存する
    getDoc,      // 特定のデータを1つ取る
    doc,         // 特定のデータの場所を指定する
    updateDoc,   // データを更新する
    query,       // 検索条件を作る
    orderBy,     // 並び替える
    limit,       // 数を制限する（TOP10など）
    getDocs      // 条件に合うデータを全部取る
};