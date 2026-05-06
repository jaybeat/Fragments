import { useState } from 'react';
import { usePlayer } from '../PlayerContext';
import Header from './Header';
import EpisodeMeta from './EpisodeMeta';
import ChapterCard from './ChapterCard';
import ChapterList from './ChapterList';
import Transcript from './Transcript';
import PlayerFooter from './PlayerFooter';
import SegmentDrawer from './SegmentDrawer';

export default function Card() {
  const { state } = usePlayer();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="card">
      <Header />
      <div className="body">
        <EpisodeMeta />
        {state.view === 'chapters' ? (
          <ChapterList />
        ) : (
          <>
            <ChapterCard onOpenDrawer={() => setDrawerOpen(true)} />
            <Transcript />
          </>
        )}
        <PlayerFooter />
        {drawerOpen && <SegmentDrawer onClose={() => setDrawerOpen(false)} />}
      </div>
    </div>
  );
}
