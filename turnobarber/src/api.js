export const api = async (url, opts) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("La API devolvió una respuesta inválida. Comprueba que el servidor esté ejecutándose.");
  }
  if (!response.ok) throw new Error(data.error || "Algo salió mal");
  return data;
};

export const post = (url, body) => api(url, {
  method: "POST",
  body: JSON.stringify(body),
});
