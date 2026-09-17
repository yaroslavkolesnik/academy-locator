import { CircleCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { request } from '../api/client.js';
import { seatsLabel } from '../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { mapFieldErrors, toRegistrationPayload } from './formErrors.js';
import styles from './RegistrationDialog.module.css';

const INITIAL_VALUES = { name: '', contact: '', participantAge: '', comment: '', consent: false };
const FORM_ID = 'registration-form';

export function RegistrationDialog({ course, institution, open, onClose, onRegistered }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setValues(INITIAL_VALUES);
    setErrors({});
    setFormError('');
    setSubmitting(false);
    setResult(null);
  }, [open]);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const response = await request(`/api/courses/${encodeURIComponent(course.id)}/registrations`, {
        method: 'POST',
        body: toRegistrationPayload(values),
      });
      setResult(response);
      onRegistered?.(response.seatsLeft);
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
        const fieldErrors = mapFieldErrors(error.details);
        setErrors(fieldErrors);
        setFormError(fieldErrors._form ?? '');
        const first = Object.keys(fieldErrors).find((key) => key !== '_form');
        // setTimeout, а не requestAnimationFrame: rAF не виконується у фонових вкладках
        setTimeout(() => formRef.current?.querySelector(`[name="${first}"]`)?.focus(), 0);
      } else if (error.code === 'NO_SEATS') {
        setFormError('На жаль, місця на цей курс щойно закінчились.');
        onRegistered?.(0);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Dialog open={open} onClose={onClose} title="Заявку прийнято" footer={<Button onClick={onClose}>Готово</Button>}>
        <div className={styles.success} role="status">
          <CircleCheck aria-hidden="true" size={44} className={styles.successIcon} />
          <p>
            Дякуємо, {values.name.trim()}! {institution.shortName} зв’яжеться з вами за контактом{' '}
            <strong>{values.contact.trim()}</strong>.
          </p>
          {result.seatsLeft !== null && <p className={styles.muted}>{seatsLabel(result.seatsLeft)}</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Реєстрація на курс"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? 'Надсилаємо…' : 'Надіслати заявку'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={formRef} noValidate onSubmit={onSubmit} className={styles.form}>
        <p className={styles.course}>
          <strong>{course.title}</strong>
          <span>
            {institution.shortName} · {course.scheduleText}
          </span>
        </p>
        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
        <Field label="Ім’я" error={errors.name} required>
          <input name="name" autoComplete="name" value={values.name} onChange={update('name')} />
        </Field>
        <Field
          label="Телефон або email"
          hint="Наприклад, +380 50 123 45 67 або name@example.com"
          error={errors.contact}
          required
        >
          <input name="contact" autoComplete="tel" value={values.contact} onChange={update('contact')} />
        </Field>
        <Field label="Вік учасника" error={errors.participantAge}>
          <input
            name="participantAge"
            type="number"
            inputMode="numeric"
            min="0"
            max="120"
            value={values.participantAge}
            onChange={update('participantAge')}
          />
        </Field>
        <Field label="Коментар" error={errors.comment}>
          <textarea name="comment" maxLength={500} value={values.comment} onChange={update('comment')} />
        </Field>
        <Checkbox
          name="consent"
          checked={values.consent}
          onChange={update('consent')}
          error={errors.consent}
          label="Погоджуюся на обробку персональних даних для зв’язку щодо курсу"
        />
      </form>
    </Dialog>
  );
}
