import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import ActivityDrawer from './components/ActivityDrawer';
import Browse from './screens/Browse';
import Detail from './screens/Detail';
import MyBids from './screens/MyBids';
import Watchlist from './screens/Watchlist';
import Compare from './screens/Compare';
import Notes from './screens/Notes';
import s from './App.module.scss';

export default function App() {
  return (
    <div className={s.shell}>
      <Header />
      <main className={s.main}>
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/lot/:id" element={<Detail />} />
          <Route path="/bids" element={<MyBids />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ActivityDrawer />
      <Toast />
      <BottomNav />
    </div>
  );
}
