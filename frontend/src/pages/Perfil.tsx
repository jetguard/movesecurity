import { useEffect, useState } from "react";
import { api } from "../services/api";

type UsuarioPerfil = {
  id: number;
  nome: string;
  email: string;
  apelido?: string;
  fotoPerfil?: string;
  re?: string;
  setor?: string;
  cargo?: string;
  empresa?: string;
  unidade?: string;
  perfilAcesso?: string;
  statusUsuario?: string;
};

export default function Perfil() {
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [apelido, setApelido] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState("");
  const [removerFoto, setRemoverFoto] = useState(false);

  async function carregarPerfil() {
    const response = await api.get("/usuarios/me");

    setPerfil(response.data);
    setApelido(response.data.apelido || "");
    setPreviewFoto(response.data.fotoPerfil || "");
    setRemoverFoto(false);
  }

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];

    if (!arquivo) return;

    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatosPermitidos.includes(arquivo.type)) {
      alert("Use uma imagem JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }

    setFotoPerfil(arquivo);
    setPreviewFoto(URL.createObjectURL(arquivo));
    setRemoverFoto(false);
  }

  function removerFotoAtual() {
    setFotoPerfil(null);
    setPreviewFoto("");
    setRemoverFoto(true);
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("apelido", apelido);
    formData.append("removerFoto", String(removerFoto));

    if (fotoPerfil) {
      formData.append("fotoPerfil", fotoPerfil);
    }

    const response = await api.put("/usuarios/me", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    localStorage.setItem("usuario", JSON.stringify(response.data));
    setPerfil(response.data);
    setFotoPerfil(null);
    setRemoverFoto(false);
    setPreviewFoto(response.data.fotoPerfil || "");
    alert("Perfil atualizado com sucesso");
  }

  useEffect(() => {
    carregarPerfil();
  }, []);

  if (!perfil) {
    return (
      <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
        Carregando perfil...
      </div>
    );
  }

  const fotoUrl = previewFoto.startsWith("blob:")
    ? previewFoto
    : previewFoto || "";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Perfil do Usuário</h1>
        <p className="text-gray-500 mt-1">
          Edite sua foto de perfil e seu apelido de exibição.
        </p>
      </div>

      <form
        onSubmit={salvarPerfil}
        className="bg-white rounded-xl shadow p-6 space-y-6"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-4 md:w-56">
            <div className="w-36 h-36 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-4xl font-bold text-slate-500">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt="Foto do perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                (perfil.apelido || perfil.nome).charAt(0).toUpperCase()
              )}
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {perfil.apelido || perfil.nome}
              </p>
              <p className="text-sm text-slate-500">{perfil.email}</p>
            </div>

            <label className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg cursor-pointer">
              Alterar Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selecionarFoto}
                className="hidden"
              />
            </label>

            {fotoUrl && (
              <button
                type="button"
                onClick={removerFotoAtual}
                className="w-full text-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Remover Foto
              </button>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Apelido
              </span>
              <input
                className="w-full border rounded-lg p-3"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Como prefere ser chamado"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Nome completo
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.nome || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Perfil de acesso
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.perfilAcesso || "USUARIO"}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">R.E</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.re || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Setor</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.setor || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Cargo</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.cargo || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Unidade</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.unidade || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Empresa
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.empresa || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Email</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.email || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Status do usuário
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.statusUsuario || ""}
                readOnly
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">
            Salvar Perfil
          </button>
        </div>
      </form>
    </div>
  );
}

