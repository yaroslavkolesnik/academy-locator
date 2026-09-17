import { Route, Routes } from 'react-router';
import { AdminPage } from './admin/AdminPage.jsx';
import { AddInstitutionPanel } from './forms/AddInstitutionPanel.jsx';
import { MapLayout } from './layout/MapLayout.jsx';
import { CourseDetailsPanel } from './panels/CourseDetailsPanel.jsx';
import { DirectionCoursesPanel } from './panels/DirectionCoursesPanel.jsx';
import { InstitutionPanel } from './panels/InstitutionPanel.jsx';
import { NotFoundPanel } from './panels/NotFoundPanel.jsx';
import { ResultsPanel } from './panels/ResultsPanel.jsx';
import { QuizDialog } from './quiz/QuizDialog.jsx';
import { MetaProvider } from './state/MetaProvider.jsx';
import { ToastProvider } from './ui/Toast.jsx';

export function App() {
  return (
    <ToastProvider>
      <MetaProvider>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route element={<MapLayout />}>
            <Route index element={<ResultsPanel />} />
            <Route path="institutions/:id" element={<InstitutionPanel />} />
            <Route path="institutions/:id/:slug" element={<DirectionCoursesPanel />} />
            <Route path="courses/:courseId" element={<CourseDetailsPanel />} />
            <Route path="add" element={<AddInstitutionPanel />} />
            <Route
              path="quiz"
              element={
                <>
                  <ResultsPanel />
                  <QuizDialog />
                </>
              }
            />
            <Route path="*" element={<NotFoundPanel />} />
          </Route>
        </Routes>
      </MetaProvider>
    </ToastProvider>
  );
}
