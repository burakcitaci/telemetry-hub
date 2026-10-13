import { api } from "@/shared/api/client";
import { parseHosts } from "./model";

export async function fetchInfrastructure(signal: AbortSignal) {
  const { data } = await api.get<unknown>("/v1/infrastructure/status", {
    signal,
  });
  return parseHosts(data);
}
