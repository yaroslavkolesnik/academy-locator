import { ArrowRight, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BackLink } from '../layout/BackLink.jsx';
import { useSheet } from '../layout/Panel.jsx';
import { isWithinBounds } from '../map/geo.js';
import shared from '../panels/Panels.module.css';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './AddInstitutionPanel.module.css';
import { InstitutionForm } from './InstitutionForm.jsx';

export function AddInstitutionPanel() {
  const { city } = useMeta();
  const { pickPoint, setPickPoint, refreshCatalog } = useMapState();
  const { setSnap } = useSheet();
  const navigate = useNavigate();
  const linkTo = useLinkTo();
  const toast = useToast();
  const [step, setStep] = useState('pick');
  useSelectedInstitution(null);

  useEffect(() => () => setPickPoint(null), [setPickPoint]);

  const inBounds = pickPoint ? isWithinBounds(pickPoint, city.bounds) : false;

  const status = !pickPoint
    ? { tone: styles.hint, text: 'Точку ще не обрано.' }
    : inBounds
      ? { tone: styles.ok, text: `Обрано: ${pickPoint.lat.toFixed(5)}, ${pickPoint.lng.toFixed(5)}` }
      : { tone: styles.error, text: 'Точка поза межами Харкова. Оберіть місце в місті.' };

  const onCreated = (institution) => {
    refreshCatalog();
    setPickPoint(null);
    toast.show('Заклад додано. Він позначений «На модерації», доки його не перевірять.', { tone: 'success' });
    navigate(linkTo(`/institutions/${institution.id}`));
  };

  return (
    <section className={shared.section} aria-labelledby="add-title">
      <BackLink to={linkTo('/')}>Скасувати</BackLink>
      <div className={shared.stack}>
        <p className={shared.eyebrow}>Крок {step === 'pick' ? 1 : 2} з 2</p>
        <h2 id="add-title" className={shared.title}>
          Додати заклад
        </h2>
      </div>

      {step === 'pick' ? (
        <>
          <p className={shared.muted}>Натисніть на карті місце, де розташований заклад. Мітку можна перетягнути.</p>
          <p aria-live="polite" className={`${styles.status} ${status.tone}`}>
            <MapPin aria-hidden="true" size={18} />
            {status.text}
          </p>
          <Button
            icon={ArrowRight}
            disabled={!inBounds}
            onClick={() => {
              setStep('form');
              setSnap('full');
            }}
          >
            Далі
          </Button>
        </>
      ) : (
        <InstitutionForm
          point={pickPoint}
          onBack={() => {
            setStep('pick');
            setSnap('peek');
          }}
          onCreated={onCreated}
        />
      )}
    </section>
  );
}
