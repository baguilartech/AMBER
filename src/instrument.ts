import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Only initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    // CAPTURE EVERYTHING - NO SAMPLING
    tracesSampleRate: 1.0,          // 100% of transactions
    profilesSampleRate: 1.0,        // 100% of profiling data
    sampleRate: 1.0,                // 100% of error events
    maxBreadcrumbs: 100,            // Maximum breadcrumbs
    // Force send everything
    debug: process.env.LOG_LEVEL === 'debug',  // Debug mode only when LOG_LEVEL=debug
    release: process.env.npm_package_version || '1.1.4',
    integrations: [
      nodeProfilingIntegration(),
      // Add more integrations for comprehensive capture  
      Sentry.httpIntegration(),
      Sentry.onUnhandledRejectionIntegration({ mode: 'warn' }),
      Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: false }),
      Sentry.nativeNodeFetchIntegration(),
      Sentry.expressIntegration(),
      Sentry.consoleIntegration()
    ],
    sendDefaultPii: true,
    // Capture EVERYTHING - no filtering
    beforeSend(event) {
      // Log every event being sent
      console.log(`[SENTRY] Sending event: ${event.type || 'unknown'} - ${event.exception?.values?.[0]?.value || event.message || 'no message'}`);
      
      // Only filter IP for privacy, capture everything else
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
    beforeSendTransaction(transaction) {
      // Log every transaction being sent
      console.log(`[SENTRY] Sending transaction: ${transaction.transaction} (${transaction.contexts?.trace?.op})`);
      return transaction;
    }
  });
  
  console.log('[SENTRY] Initialized with 100% capture rate - NO SAMPLING');
}