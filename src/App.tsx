import { Editor } from './pages/Editor';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Modal } from './components/ui/Modal';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="editor/:fileId" element={<Editor />} />
                    <Route path="inspirations" element={<div className="p-10 text-gray-500">Inspirations Module Coming Soon...</div>} />
                </Route>
            </Routes>
            <Modal />
        </BrowserRouter>
    );
}

export default App;