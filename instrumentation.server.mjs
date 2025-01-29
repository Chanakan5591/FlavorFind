import * as Sentry from "@sentry/remix";

Sentry.init({
    dsn: "https://5b08660faae9b1be3cd21a9c36c3f618@o4504890693910528.ingest.us.sentry.io/4508726746480640",
    tracesSampleRate: 1,
    autoInstrumentRemix: true
})
