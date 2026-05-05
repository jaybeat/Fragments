import { useState } from 'react';
import Header from './Header';
import EpisodeMeta from './EpisodeMeta';
import SegmentProgress from './SegmentProgress';
import ChapterCard from './ChapterCard';
import Transcript from './Transcript';
import PlayerFooter from './PlayerFooter';
import SegmentDrawer from './SegmentDrawer';

export default function Card() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="card">
      <Header />
      <div className="body">
        <EpisodeMeta />
        <SegmentProgress />
        <ChapterCard onOpenDrawer={() => setDrawerOpen(true)} />
        <Transcript />
        <PlayerFooter />
        {drawerOpen && <SegmentDrawer onClose={() => setDrawerOpen(false)} />}
      </div>
    </div>
  );
}
