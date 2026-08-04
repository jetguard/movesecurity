export function formatarNomePessoa(valor: string) {
  if (valor.includes("@")) {
    return "";
  }

  return valor
    .replace(/[^\p{L}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trimStart()
    .split(" ")
    .filter(Boolean)
    .map(capitalizarPartesNome)
    .join(" ");
}

export function nomePessoaValido(valor: string) {
  const nome = formatarNomePessoa(valor).trim();
  if (!nome || valor.includes("@") || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(valor.trim())) {
    return false;
  }
  return nome.split(/\s+/).filter(Boolean).length >= 2;
}

function capitalizarPartesNome(palavra: string) {
  return palavra
    .split(/([-'])/g)
    .map((parte) => {
      if (parte === "-" || parte === "'") return parte;
      return parte ? parte.charAt(0).toLocaleUpperCase("pt-BR") + parte.slice(1).toLocaleLowerCase("pt-BR") : "";
    })
    .join("");
}
