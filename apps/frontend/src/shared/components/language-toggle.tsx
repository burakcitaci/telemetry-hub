import { useTranslation } from 'react-i18next';
import { languages, setLanguage, type Language } from '@/shared/i18n';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={i18n.language.startsWith('de') ? 'de' : 'en'}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="h-7 rounded-sm border border-input bg-background px-1.5 text-xs text-foreground"
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
