import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import GenerateReport from './pages/GenerateReport';
import History from './pages/History';
import Analyze from './pages/Analyze';
import ThinkingSpace from './pages/Thinkingspace';
import UploadPage from './pages/Upload';


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* The Front Page */}
            <Route index element={<Home />} />
            
            {/* The 3 Sections */}
            <Route path="generate" element={<GenerateReport />} />
            <Route path="history" element={<History />} />
            <Route path="analyze" element={<Analyze />} />
            <Route path="/thinking-space" element={<ThinkingSpace />} />
            <Route path="upload" element={<UploadPage />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
