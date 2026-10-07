function abrirModal(){const m=document.getElementById("fs-modal-compromisso");if(!m)return;m.setAttribute("aria-hidden","false");m.style.display="grid";}
function fecharModal(){const m=document.getElementById("fs-modal-compromisso");if(!m)return;m.setAttribute("aria-hidden","true");m.style.display="none";}
export async function inicializarPlanejamento(){
 const erro=document.getElementById("fs-planejamento-erro");
 const botao=document.getElementById("fs-btn-novo-compromisso");
 botao?.removeAttribute("disabled");
 botao?.addEventListener("click",abrirModal);
 document.getElementById("fs-fechar-compromisso")?.addEventListener("click",fecharModal);
 document.getElementById("fs-cancelar-compromisso")?.addEventListener("click",fecharModal);
 document.getElementById("fs-modal-compromisso")?.addEventListener("click",e=>{if(e.target.id==="fs-modal-compromisso")fecharModal()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")fecharModal()});
 if(erro){erro.hidden=true;}
}
