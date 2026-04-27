import { Editor } from './pages/Editor';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { TrophyWall } from './pages/TrophyWall';
import { CollectionBoard } from './pages/CollectionBoard';
import { CreativeSettings } from './pages/CreativeSettings';
import { RoleplayChat } from './pages/RoleplayChat';
import { Modal } from './components/ui/Modal';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="editor/:fileId" element={<Editor />} />
                    <Route path="journal" element={<Journal />} />
                    <Route path="trophies" element={<TrophyWall />} />
                    <Route path="inspirations" element={<CollectionBoard itemType="inspiration" />} />
                    <Route path="materials" element={<CollectionBoard itemType="material" />} />
                    <Route path="creative-settings" element={<CreativeSettings />} />
                    <Route path="roleplay" element={<RoleplayChat />} />
                </Route>
            </Routes>
            <Modal />
        </BrowserRouter>
    );
}

export default App;
