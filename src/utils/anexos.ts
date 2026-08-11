import type { Anexo } from '../types';

/** Limite de segurança por arquivo — o armazenamento é local (localStorage), sem backend. */
export const TAMANHO_MAX_ANEXO = 4 * 1024 * 1024; // 4MB por arquivo
export const MAX_ANEXOS_POR_ENVIO = 10;

export function lerArquivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function arquivosParaAnexos(files: File[]): Promise<Anexo[]> {
  const anexos: Anexo[] = [];
  for (const file of files) {
    const url = await lerArquivoComoDataUrl(file);
    anexos.push({
      id: `an${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
      nome: file.name,
      url,
      tipo: file.type,
      dataUpload: new Date().toISOString(),
    });
  }
  return anexos;
}
