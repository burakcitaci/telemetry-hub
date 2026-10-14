export function assertUniqueService(deployments, name, service) {
  const duplicate = deployments.find(deployment => deployment.metadata.name !== name
    && (deployment.spec?.replicas ?? 1) > 0
    && (deployment.metadata.annotations?.['telemetry-hub/service-name'] === service
      || deployment.spec?.template?.spec?.containers?.some(container =>
        container.env?.some(variable => variable.name === 'OTEL_SERVICE_NAME' && variable.value === service))));
  if (duplicate) throw new Error(`Service ${service} is already used by deployment ${duplicate.metadata.name}.`);
}
