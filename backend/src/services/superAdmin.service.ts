import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { serializarUnidadesPermitidas, UNIDADES_SISTEMA } from "../config/unidades";

export async function garantirSuperAdmin() {
  const email = "fertechbyte@hotmail.com";
  const senhaPadrao = process.env.SUPER_ADMIN_PASSWORD || "Movecta@2026";

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    console.warn("SUPER_ADMIN_PASSWORD não configurada. Usando senha padrão apenas para desenvolvimento.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      email,
    },
  });

  if (!usuario) {
    await prisma.usuario.create({
      data: {
        nome: "Fernando Nunes",
        email,
        senha: await bcrypt.hash(senhaPadrao, 10),
        empresa: "Movecta S/A",
        unidade: "GJA-T1",
        unidadesPermitidas: serializarUnidadesPermitidas(UNIDADES_SISTEMA, "GJA-T1"),
        perfilAcesso: "SUPER_ADMIN",
        statusUsuario: "ATIVO",
        deveAlterarSenha: false,
        senhaAlteradaEm: new Date(),
      },
    });
    return;
  }

  if (usuario.perfilAcesso !== "SUPER_ADMIN" || usuario.statusUsuario !== "ATIVO" || usuario.deveAlterarSenha || !usuario.unidadesPermitidas) {
    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        nome: usuario.nome || "Fernando Nunes",
        empresa: usuario.empresa || "Movecta S/A",
        unidade: usuario.unidade || "GJA-T1",
        unidadesPermitidas: serializarUnidadesPermitidas(UNIDADES_SISTEMA, usuario.unidade || "GJA-T1"),
        perfilAcesso: "SUPER_ADMIN",
        statusUsuario: "ATIVO",
        deveAlterarSenha: false,
        senhaAlteradaEm: usuario.senhaAlteradaEm || new Date(),
      },
    });
  }
}

