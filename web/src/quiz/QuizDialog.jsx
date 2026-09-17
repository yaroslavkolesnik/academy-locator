import { Check, Map as MapIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { request } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { filtersToSearchString } from '../state/filters.js';
import { useMapState } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { quizIcon } from './icons.js';
import styles from './QuizDialog.module.css';
import { buildRecommendationInput, isAnswered, isSelected, resultMapFilters, toggleAnswer } from './quizInput.js';

export function QuizDialog() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const meta = useMeta();
  const { locate, showHighlight } = useMapState();
  const questionId = useId();
  const { data: quiz, error, slow, reload } = useApi('/api/quiz');

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [usedCoords, setUsedCoords] = useState(null);
  const [locationMissing, setLocationMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const close = () => navigate({ pathname: '/', search });

  const restart = () => {
    setResult(null);
    setIndex(0);
  };

  const finish = async () => {
    setSubmitting(true);
    setSubmitError('');
    const { wantsLocation } = buildRecommendationInput(quiz, answers, null);
    const coords = wantsLocation ? await locate() : null;
    const { input } = buildRecommendationInput(quiz, answers, coords);
    try {
      const response = await request('/api/recommendations', { method: 'POST', body: input });
      setUsedCoords(coords);
      setLocationMissing(wantsLocation && !coords);
      setResult(response);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyResult = (pathname) => {
    const filters = resultMapFilters(result, meta, usedCoords);
    showHighlight([...new Set(result.items.map((item) => item.institution.id))], filters);
    navigate({ pathname, search: filtersToSearchString(filters) });
  };

  if (error) {
    return (
      <Dialog open onClose={close} title="Що обрати дитині?">
        <ErrorState error={error} onRetry={reload} />
      </Dialog>
    );
  }
  if (!quiz) {
    return (
      <Dialog open onClose={close} title="Що обрати дитині?">
        <Skeleton lines={3} slow={slow} />
      </Dialog>
    );
  }

  if (result) {
    const empty = result.items.length === 0;
    return (
      <Dialog
        open
        size="lg"
        onClose={close}
        title={empty ? 'Результати підбору' : 'Ми підібрали для вас'}
        footer={
          !empty && (
            <>
              <Button variant="ghost" onClick={restart}>
                Пройти ще раз
              </Button>
              <Button icon={MapIcon} onClick={() => applyResult('/')}>
                Показати на карті
              </Button>
            </>
          )
        }
      >
        {locationMissing && <p className={styles.note}>Геолокація недоступна — підібрали без урахування відстані.</p>}
        {empty ? (
          <EmptyState
            title="Точних збігів немає"
            text="Спробуйте обрати більше інтересів, інший формат або платні заняття."
            action={<Button onClick={restart}>Змінити відповіді</Button>}
          />
        ) : (
          <ol className={styles.results}>
            {result.items.map((item, position) => (
              <li key={item.course.id} className={styles.result}>
                <span className={styles.rank} aria-hidden="true">
                  {position + 1}
                </span>
                <div className={styles.resultBody}>
                  <h3>{item.course.title}</h3>
                  <p className={styles.muted}>
                    {item.institution.shortName} · {item.direction.name}
                  </p>
                  <ul className={styles.reasons}>
                    {item.reasons.map((reason) => (
                      <li key={reason}>
                        <Check aria-hidden="true" size={16} />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" size="sm" onClick={() => applyResult(`/courses/${item.course.id}`)}>
                    Детальніше
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Dialog>
    );
  }

  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;
  const answered = isAnswered(question, answers);
  const total = quiz.questions.length;

  return (
    <Dialog
      open
      onClose={close}
      title={quiz.title}
      footer={
        <>
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              Назад
            </Button>
          )}
          <Button disabled={!answered || submitting} onClick={last ? finish : () => setIndex((i) => i + 1)}>
            {last ? (submitting ? 'Підбираємо…' : 'Показати результати') : 'Далі'}
          </Button>
        </>
      }
    >
      <div className={styles.progressWrap}>
        <p className={styles.muted}>
          Питання {index + 1} з {total}
        </p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Прогрес квізу"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <span style={{ transform: `scaleX(${(index + 1) / total})` }} />
        </div>
      </div>
      <h3 id={questionId} className={styles.question}>
        {question.title}
      </h3>
      {question.subtitle && <p className={styles.muted}>{question.subtitle}</p>}
      {submitError && (
        <p role="alert" className={styles.error}>
          {submitError}
        </p>
      )}
      <div role="group" aria-labelledby={questionId} className={styles.options}>
        {question.options.map((option) => {
          const Icon = quizIcon(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              aria-pressed={isSelected(question, answers, option.id)}
              onClick={() => setAnswers((prev) => toggleAnswer(question, prev, option.id))}
            >
              <Icon aria-hidden="true" size={24} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
