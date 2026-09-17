import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { request } from '../api/client.js';
import { toggleValue } from '../state/filters.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Button } from '../ui/Button.jsx';
import { Chip } from '../ui/Chip.jsx';
import { Field } from '../ui/Field.jsx';
import { mapFieldErrors, toSubmissionPayload } from './formErrors.js';
import styles from './InstitutionForm.module.css';

const INITIAL_VALUES = {
  name: '',
  type: '',
  address: '',
  shortDescription: '',
  website: '',
  phone: '',
  email: '',
  contactPerson: '',
  hasShelter: '',
  declaredDirectionIds: [],
};

const SHELTER_OPTIONS = [
  { value: 'yes', label: 'Так' },
  { value: 'no', label: 'Ні' },
  { value: '', label: 'Не вказано' },
];

const POINT_ERROR = 'Точка на карті поза межами міста. Поверніться до кроку 1 і оберіть іншу.';

// requestAnimationFrame не виконується у фонових вкладках, тож фокус ставимо через setTimeout
const focusLater = (form, field) => setTimeout(() => form?.querySelector(`[name="${field}"]`)?.focus(), 0);

export function InstitutionForm({ point, onBack, onCreated }) {
  const { institutionTypes, directions, categories } = useMeta();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const update = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleDirection = (id) =>
    setValues((prev) => ({ ...prev, declaredDirectionIds: toggleValue(prev.declaredDirectionIds, id) }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const { institution } = await request('/api/institutions', {
        method: 'POST',
        body: toSubmissionPayload(values, point),
      });
      onCreated(institution);
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
        const fieldErrors = mapFieldErrors(error.details);
        setErrors(fieldErrors);
        setFormError(fieldErrors.lat || fieldErrors.lng ? POINT_ERROR : (fieldErrors._form ?? ''));
        const first = Object.keys(fieldErrors).find((key) => !['lat', 'lng', '_form'].includes(key));
        if (first) focusLater(formRef.current, first);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className={styles.form}>
      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}

      <Field label="Назва закладу" required error={errors.name}>
        <input name="name" value={values.name} onChange={update('name')} />
      </Field>
      <Field label="Тип закладу" required error={errors.type}>
        <select name="type" value={values.type} onChange={update('type')}>
          <option value="">Оберіть тип</option>
          {institutionTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Адреса" required hint="Вулиця та номер будинку" error={errors.address}>
        <input name="address" autoComplete="street-address" value={values.address} onChange={update('address')} />
      </Field>
      <Field label="Короткий опис" hint={`${values.shortDescription.length} / 300`} error={errors.shortDescription}>
        <textarea
          name="shortDescription"
          maxLength={300}
          value={values.shortDescription}
          onChange={update('shortDescription')}
        />
      </Field>
      <Field label="Сайт" hint="Починається з https://" error={errors.website}>
        <input name="website" type="url" inputMode="url" autoComplete="url" value={values.website} onChange={update('website')} />
      </Field>
      <Field label="Телефон" hint="Потрібен телефон або email" error={errors.phone}>
        <input name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={update('phone')} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoComplete="email" value={values.email} onChange={update('email')} />
      </Field>
      <Field label="Контактна особа" hint="Бачить лише модератор" error={errors.contactPerson}>
        <input name="contactPerson" autoComplete="name" value={values.contactPerson} onChange={update('contactPerson')} />
      </Field>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Чи є укриття?</legend>
        <div className={styles.segmented}>
          {SHELTER_OPTIONS.map((option) => (
            <label key={option.label} className={styles.segment}>
              <input
                type="radio"
                name="hasShelter"
                value={option.value}
                checked={values.hasShelter === option.value}
                onChange={update('hasShelter')}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Напрямки</legend>
        <p className={styles.hint}>Оберіть, чого навчають у закладі.</p>
        <div className={styles.chips}>
          {categories.flatMap((category) =>
            directions
              .filter((d) => d.categoryCode === category.code)
              .map((d) => (
                <Chip
                  key={d.id}
                  color={category.color}
                  pressed={values.declaredDirectionIds.includes(d.id)}
                  onToggle={() => toggleDirection(d.id)}
                >
                  {d.name}
                </Chip>
              )),
          )}
        </div>
        {errors.declaredDirectionIds && (
          <p role="alert" className={styles.fieldError}>
            {errors.declaredDirectionIds}
          </p>
        )}
      </fieldset>

      <div className={styles.actions}>
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Змінити точку
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Надсилаємо…' : 'Надіслати на модерацію'}
        </Button>
      </div>
    </form>
  );
}
