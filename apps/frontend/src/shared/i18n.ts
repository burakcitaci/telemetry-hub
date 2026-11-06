import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const languages = ['en', 'de'] as const;
export type Language = (typeof languages)[number];

const resources = {
  en: {
    translation: {
      'language.label': 'Language',
      'language.en': 'English',
      'language.de': 'German',
      'auth.signIn': 'Sign in',
      'auth.signingIn': 'Signing in…',
      'auth.organization': 'Organization (Tenant)',
      'auth.organizationHelp':
        'Use the organization URL slug provided by your administrator, for example acme-observability.',
      'auth.email': 'Email address',
      'auth.password': 'Password',
      'auth.title': 'Sign in to your organization',
      'auth.failed': 'Sign-in failed.',
      'nav.explorer': 'Explorer',
      'nav.services': 'Services',
      'nav.metrics': 'Metrics',
      'nav.traces': 'Traces',
      'nav.logs': 'Logs',
      'nav.monitors': 'Monitors',
      'nav.infrastructure': 'Infrastructure',
      'nav.administration': 'Administration',
      'nav.serviceHealth': 'Service health',
      'nav.collectedMetrics': 'Collected metrics',
      'nav.distributedRequests': 'Distributed requests',
      'nav.applicationEvents': 'Application events',
      'nav.kubernetesHosts': 'Kubernetes hosts',
      'nav.organizationSettings': 'Organization settings',
      'header.logout': 'Log out',
      'header.logoutFailed': 'Logout failed.',
      'error.routeNotFound': 'Route not found',
      'error.investigationLink': 'This investigation link does not match an available page.',
      'error.backMetrics': 'Back to Metrics',
      'error.backSignIn': 'Back to sign in',
    },
  },
  de: {
    translation: {
      'language.label': 'Sprache',
      'language.en': 'Englisch',
      'language.de': 'Deutsch',
      'auth.signIn': 'Anmelden',
      'auth.signingIn': 'Anmeldung läuft…',
      'auth.organization': 'Organisation (Mandant)',
      'auth.organizationHelp':
        'Verwende den von deiner Administration angegebenen Organisations-Slug, zum Beispiel acme-observability.',
      'auth.email': 'E-Mail-Adresse',
      'auth.password': 'Passwort',
      'auth.title': 'Bei deiner Organisation anmelden',
      'auth.failed': 'Anmeldung fehlgeschlagen.',
      'nav.explorer': 'Explorer',
      'nav.services': 'Services',
      'nav.metrics': 'Metriken',
      'nav.traces': 'Traces',
      'nav.logs': 'Logs',
      'nav.monitors': 'Monitore',
      'nav.infrastructure': 'Infrastruktur',
      'nav.administration': 'Administration',
      'nav.serviceHealth': 'Servicezustand',
      'nav.collectedMetrics': 'Erfasste Metriken',
      'nav.distributedRequests': 'Verteilte Anfragen',
      'nav.applicationEvents': 'Anwendungsereignisse',
      'nav.kubernetesHosts': 'Kubernetes-Hosts',
      'nav.organizationSettings': 'Organisationseinstellungen',
      'header.logout': 'Abmelden',
      'header.logoutFailed': 'Abmelden fehlgeschlagen.',
      'error.routeNotFound': 'Route nicht gefunden',
      'error.investigationLink': 'Dieser Untersuchungslink verweist auf keine verfügbare Seite.',
      'error.backMetrics': 'Zurück zu Metriken',
      'error.backSignIn': 'Zurück zur Anmeldung',
    },
  },
} as const;

const stored =
  typeof window !== 'undefined' ? window.localStorage.getItem('telemetry-hub-language') : null;
const initialLanguage: Language = stored === 'de' ? 'de' : 'en';

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export function setLanguage(language: Language) {
  void i18n.changeLanguage(language);
  window.localStorage.setItem('telemetry-hub-language', language);
}

export default i18n;
