import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/page-primitives/PageContainer";
import { PageError } from "@/components/page-primitives/PageError";
import { Button } from "@/components/ui/button";

function ServerUnavailablePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  // Re-run the root guard: it re-probes the backend (the probe caches were
  // cleared on failure). If the server is back, the guard redirects into the
  // app; if not, we stay here.
  const retry = async () => {
    setRetrying(true);
    try {
      await router.invalidate();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <PageContainer variant="fullscreen">
      <PageError
        subHeader={t("errors.serverUnavailable.code")}
        header={t("errors.serverUnavailable.title")}
        message={
          <>
            {t("errors.serverUnavailable.message")}
            <br />
            {t("errors.serverUnavailable.messageSecondLine")}
          </>
        }
        errorType={t("errors.serverUnavailable.type")}
        action={
          <Button variant="outline" onClick={retry} disabled={retrying}>
            {retrying ? t("common.trying") : t("common.tryAgain")}
          </Button>
        }
      />
    </PageContainer>
  );
}

export default ServerUnavailablePage;
