'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import InterestSelect from '@/components/form/InterestSelect';
import OrderTable, { type OrderItem } from '@/components/form/OrderTable';
import { cn } from '@/lib/cn';
import { MAX_QUANTITY, findProduct, products } from '@/lib/products';
import { onOrderIntent } from '@/lib/order-intent';
import { isValidByPhone, submitLead, type LeadInterest, type LeadPayload } from '@/lib/lead-client';
import { site, subscriptionLabel } from '@/lib/site';

type Interest = '' | LeadInterest;

type Errors = {
  name?: boolean;
  phone?: boolean;
  interest?: boolean;
  sort?: boolean;
  comment?: boolean;
};

type Status = {
  kind: 'success' | 'duplicate' | 'error';
  title: string;
  text: string;
};

const STATUS_STYLES: Record<Status['kind'], string> = {
  success: 'border-olive/50 bg-olive/10',
  duplicate: 'border-ink/40 bg-ink/5',
  error: 'border-stamp-deep/60 bg-stamp/10',
};

const fieldClass =
  'w-full min-h-[48px] px-4 bg-paper text-ink border border-ink/30 rounded-md placeholder:text-espresso/40 focus:border-ink transition-colors duration-200';

const hintClass = 'mt-1.5 text-xs text-muted';
const errorClass = 'mt-1.5 text-xs font-semibold text-stamp-deep';

export default function LeadForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState<Interest>('');
  const [comment, setComment] = useState('');
  const [sortSlug, setSortSlug] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [subscription, setSubscription] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const interestRef = useRef<HTMLSelectElement>(null);
  const sortRef = useRef<HTMLSelectElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const isOrder = interest === 'order';
  const isQuestion = interest === 'question';

  function addProduct(slug: string) {
    if (!findProduct(slug)) return;

    setItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (existing) {
        return current.map((item) =>
          item.slug === slug ? { ...item, qty: Math.min(item.qty + 1, MAX_QUANTITY) } : item,
        );
      }

      return [...current, { slug, qty: 1 }];
    });
  }

  function removeProduct(slug: string) {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }

  function changeQuantity(slug: string, delta: number) {
    setItems((current) =>
      current.map((item) =>
        item.slug === slug
          ? { ...item, qty: Math.min(Math.max(item.qty + delta, 1), MAX_QUANTITY) }
          : item,
      ),
    );
  }

  function changeInterest(value: string) {
    const next = value as Interest;
    setInterest(next);

    if (next !== 'order') {
      // В режим вопроса данные заказа попадать не должны.
      setItems([]);
      setSubscription(false);
      setSortSlug('');
      setErrors((current) => ({ ...current, sort: false }));
    }

    if (next !== 'question') {
      setErrors((current) => ({ ...current, comment: false }));
    }
  }

  function resetForm() {
    setName('');
    setPhone('');
    setInterest('');
    setComment('');
    setSortSlug('');
    setItems([]);
    setSubscription(false);
    setErrors({});
  }

  async function send(payload: LeadPayload) {
    setSending(true);
    setStatus(null);

    try {
      const result = await submitLead(payload);

      if (result.kind === 'duplicate') {
        setStatus({
          kind: 'duplicate',
          title: 'Заявка уже принята',
          text: 'Мы уже получили заявку с этого номера и скоро перезвоним.',
        });
        return;
      }

      setStatus({
        kind: 'success',
        title: 'Заявка принята — перезвоним',
        text: `Спасибо, ${payload.name}. Перезвоним в рабочее время.`,
      });
      resetForm();
    } catch {
      // Данные не стираем: пользователь может повторить отправку.
      setStatus({
        kind: 'error',
        title: 'Не удалось отправить заявку',
        text: 'Проверьте связь и попробуйте ещё раз. Введённые данные сохранены.',
      });
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const trimmedName = name.trim();
    const trimmedComment = comment.trim();
    const nextErrors: Errors = {};

    if (trimmedName === '') nextErrors.name = true;
    if (!isValidByPhone(phone)) nextErrors.phone = true;
    if (interest === '') nextErrors.interest = true;
    if (interest === 'order' && sortSlug === '' && items.length === 0) nextErrors.sort = true;
    if (interest === 'question' && trimmedComment === '') nextErrors.comment = true;

    setErrors(nextErrors);
    setStatus(null);

    if (Object.keys(nextErrors).length > 0) {
      const candidates: Array<HTMLElement | null> = [
        nextErrors.name ? nameRef.current : null,
        nextErrors.phone ? phoneRef.current : null,
        nextErrors.interest ? interestRef.current : null,
        nextErrors.sort ? sortRef.current : null,
        nextErrors.comment ? commentRef.current : null,
      ];

      candidates.find((element) => element !== null)?.focus();
      return;
    }

    // Сорт из селекта тоже попадает в заявку, даже если его не добавили в таблицу.
    const sorts = [...items];
    if (sortSlug !== '' && !sorts.some((item) => item.slug === sortSlug)) {
      sorts.push({ slug: sortSlug, qty: 1 });
    }

    await send({
      name: trimmedName,
      phone,
      interest: interest as LeadInterest,
      comment: trimmedComment,
      sorts,
      subscription: isOrder ? subscription : false,
    });
  }

  // «Заказать» в карточке товара: включаем режим заказа, добавляем сорт, ведём к форме.
  useEffect(() => {
    return onOrderIntent((slug) => {
      setInterest('order');
      setSortSlug(slug);
      addProduct(slug);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 350);
    });
  }, []);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="bg-cream text-ink border border-ink/25 rounded-lg p-5 sm:p-8 max-[359px]:-mx-4 max-[359px]:rounded-none max-[359px]:p-4"
    >
      <div className="space-y-6">
        {/* Имя */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-ink mb-2">
            Как вас зовут{' '}
            <span className="text-stamp-deep" aria-hidden="true">
              *
            </span>
          </label>
          <input
            ref={nameRef}
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Аня"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name || undefined}
            aria-describedby="name-error"
            className={fieldClass}
          />
          <p id="name-error" role="alert" hidden={!errors.name} className={errorClass}>
            Напишите, как к вам обращаться.
          </p>
        </div>

        {/* Телефон */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-ink mb-2">
            Телефон{' '}
            <span className="text-stamp-deep" aria-hidden="true">
              *
            </span>
          </label>
          <input
            ref={phoneRef}
            type="tel"
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="+375 29 123-45-67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={errors.phone || undefined}
            aria-describedby="phone-hint phone-error"
            className={fieldClass}
          />
          <p id="phone-hint" className={hintClass}>
            Белорусский номер — по нему перезвоним.
          </p>
          <p id="phone-error" role="alert" hidden={!errors.phone} className={errorClass}>
            Введите белорусский номер: +375 29 123-45-67
          </p>
        </div>

        {/* Что интересует: от выбора зависят поля ниже */}
        <div>
          <label htmlFor="interest" className="block text-sm font-semibold text-ink mb-2">
            Что интересует{' '}
            <span className="text-stamp-deep" aria-hidden="true">
              *
            </span>
          </label>
          <InterestSelect
            value={interest}
            onChange={changeInterest}
            invalid={Boolean(errors.interest)}
            describedBy="interest-error"
            required
          />
          <p id="interest-error" role="alert" hidden={!errors.interest} className={errorClass}>
            Выберите, что интересует.
          </p>
        </div>

        {/* Режим «заказ»: свитчер подписки, сорт кофе и таблица заказа */}
        <div id="mode-order" hidden={!isOrder} className="space-y-6">
          <Switch
            id="subscription-switch"
            checked={subscription}
            onChange={setSubscription}
            label={subscriptionLabel}
            hint="Включите, если хотите получать кофе каждый месяц"
          />

          <div>
            <label htmlFor="sort" className="block text-sm font-semibold text-ink mb-2">
              Сорт кофе{' '}
              <span className="text-stamp-deep" aria-hidden="true">
                *
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                ref={sortRef}
                id="sort"
                name="sort"
                required={isOrder}
                value={sortSlug}
                onChange={(event) => setSortSlug(event.target.value)}
                aria-invalid={errors.sort || undefined}
                aria-describedby="sort-error"
                className={cn(fieldClass, 'flex-1 min-w-0 px-4 py-2 cursor-pointer')}
              >
                <option value="" disabled>
                  Не выбрано
                </option>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name} — {product.price} BYN
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="md"
                className="shrink-0"
                onClick={() => {
                  if (sortSlug === '') {
                    sortRef.current?.focus();
                    return;
                  }
                  addProduct(sortSlug);
                }}
              >
                Добавить
              </Button>
            </div>
            <p id="sort-error" role="alert" hidden={!errors.sort} className={errorClass}>
              Выберите сорт кофе.
            </p>

            <OrderTable
              items={items}
              onIncrease={(slug) => changeQuantity(slug, 1)}
              onDecrease={(slug) => changeQuantity(slug, -1)}
              onRemove={removeProduct}
            />
          </div>
        </div>

        {/* Комментарий: необязателен в заказе, обязателен в вопросе */}
        <div id="comment-field">
          <label htmlFor="comment" className="block text-sm font-semibold text-ink mb-2">
            <span id="comment-label">{isQuestion ? 'Вопрос' : 'Комментарий'}</span>{' '}
            <span
              id="comment-required"
              className="text-stamp-deep"
              aria-hidden="true"
              hidden={!isQuestion}
            >
              *
            </span>
          </label>
          <textarea
            ref={commentRef}
            id="comment"
            name="comment"
            rows={3}
            required={isQuestion}
            placeholder="Например: помол под воронку, привезти в офис"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-invalid={errors.comment || undefined}
            aria-describedby="comment-hint comment-question-hint comment-error"
            className={cn(fieldClass, 'py-3 resize-y')}
          />
          <p id="comment-hint" hidden={isQuestion} className={hintClass}>
            Необязательно: помол, адрес, пожелания.
          </p>
          <p id="comment-question-hint" hidden={!isQuestion} className={hintClass}>
            Напишите вопрос — перезвоним и ответим.
          </p>
          <p id="comment-error" role="alert" hidden={!errors.comment} className={errorClass}>
            Напишите вопрос.
          </p>
        </div>

        {/* Кнопка отправки */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={sending}
            className="w-full sm:w-auto px-8"
          >
            {sending ? 'Отправляем…' : 'Отправить заявку'}
          </Button>
        </div>
      </div>

      {/* Статус отправки: успех, дубликат, ошибка сети */}
      <div id="form-status" className="mt-6" aria-live="polite">
        {status ? (
          <div
            role={status.kind === 'error' ? 'alert' : 'status'}
            className={cn('border rounded-md px-4 py-3', STATUS_STYLES[status.kind])}
          >
            <p className="font-semibold text-ink">{status.title}</p>
            <p className="mt-1 text-sm text-espresso">{status.text}</p>

            {status.kind === 'error' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 border-ink/50"
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  Попробовать ещё раз
                </Button>
                <p className="mt-2 text-xs text-espresso/80">
                  Если не получится — позвоните:{' '}
                  <a
                    className="underline decoration-stamp/60 underline-offset-4"
                    href={`tel:${site.phone.tel}`}
                  >
                    {site.phone.display}
                  </a>{' '}
                  или напишите на{' '}
                  <a
                    className="underline decoration-stamp/60 underline-offset-4"
                    href={`mailto:${site.email}`}
                  >
                    {site.email}
                  </a>
                  .
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
