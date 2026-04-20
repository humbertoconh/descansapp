'use client'

export default function PrivacidadPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f0eb; color: #1a1612; font-family: 'DM Sans', sans-serif; }
        .priv-page { max-width: 800px; margin: 0 auto; padding: 3rem 2rem; }
        .priv-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 3px; color: #c4a520; margin-bottom: 2rem; text-decoration: none; display: inline-block; }
        .priv-header { background: #1a1612; border-radius: 8px; padding: 2.5rem; margin-bottom: 2rem; }
        .priv-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 3px; color: #f5c518; margin-bottom: 0.5rem; }
        .priv-header p { color: #8a8070; font-size: 0.85rem; line-height: 1.6; }
        .priv-header .meta { margin-top: 1rem; font-size: 0.78rem; color: #6a6058; }
        .seccion { background: #fff; border: 1px solid #e0d8d0; border-radius: 4px; padding: 1.5rem; margin-bottom: 1rem; }
        .seccion h2 { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; color: #c4a520; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0d8d0; }
        .seccion p { font-size: 0.9rem; color: #4a4038; line-height: 1.7; margin-bottom: 0.75rem; }
        .seccion p:last-child { margin-bottom: 0; }
        .seccion ul { padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .seccion ul li { font-size: 0.9rem; color: #4a4038; line-height: 1.7; margin-bottom: 0.25rem; }
        .tabla-datos { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; font-size: 0.88rem; }
        .tabla-datos th { background: #f5f0eb; color: #4a4038; font-weight: 600; padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #e0d8d0; font-size: 0.82rem; }
        .tabla-datos td { padding: 0.5rem 0.75rem; border: 1px solid #e0d8d0; color: #4a4038; vertical-align: top; }
        .tabla-datos tr:nth-child(even) td:first-child { background: #fdf8e8; }
        .aviso { background: #fffbf0; border: 1px solid #f5c518; border-radius: 3px; padding: 0.75rem 1rem; font-size: 0.85rem; color: #4a4038; margin-bottom: 0.75rem; }
        .highlight { color: #c4a520; font-weight: 600; }
        .footer-priv { text-align: center; font-size: 0.78rem; color: #8a8070; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0d8d0; }
        @media (max-width: 600px) { .priv-page { padding: 1.5rem 1rem; } .priv-header { padding: 1.5rem; } .priv-header h1 { font-size: 1.8rem; } }
      `}</style>

      <div className="priv-page">
        <a href="/login" className="priv-logo">← DESCANSAPP</a>

        <div className="priv-header">
          <h1>POLÍTICA DE PRIVACIDAD</h1>
          <p>Información sobre el tratamiento de sus datos personales de conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>
          <div className="meta">Versión 2026 · Coordinadora Somt · G-46125787</div>
        </div>

        {/* 1. RESPONSABLE */}
        <div className="seccion">
          <h2>1. Responsable del tratamiento</h2>
          <table className="tabla-datos">
            <tbody>
              <tr><td><strong>Denominación</strong></td><td>Coordinadora Somt</td></tr>
              <tr><td><strong>CIF/NIF</strong></td><td>G-46125787</td></tr>
              <tr><td><strong>Domicilio</strong></td><td>Ampliación Muelle Sur S/N, SEVASA, 46024 Valencia</td></tr>
              <tr><td><strong>Correo electrónico</strong></td><td>descansapp@ctmvalencia.com</td></tr>
              <tr><td><strong>Delegado de protección</strong></td><td>Coordinadora Somt</td></tr>
            </tbody>
          </table>
        </div>

        {/* 2. DATOS */}
        <div className="seccion">
          <h2>2. Datos personales que tratamos</h2>
          <p>En el momento del registro y durante el uso de la aplicación, recogemos los siguientes datos:</p>
          <table className="tabla-datos">
            <tbody>
              <tr><td><strong>Nombre y apellidos</strong></td><td>Identificación del usuario dentro de la plataforma.</td></tr>
              <tr><td><strong>Número de chapa</strong></td><td>Identificador laboral que determina el grupo de trabajo al que pertenece el usuario.</td></tr>
              <tr><td><strong>Teléfono móvil</strong></td><td>Facilitar el contacto directo entre compañeros una vez confirmado un intercambio.</td></tr>
              <tr><td><strong>Correo electrónico</strong></td><td>Envío de notificaciones automáticas sobre el estado de los intercambios.</td></tr>
              <tr><td><strong>Contraseña</strong></td><td>Almacenada de forma cifrada. Nunca es accesible en texto claro.</td></tr>
              <tr><td><strong>Grupo de trabajo</strong></td><td>Determinado automáticamente por el número de chapa o seleccionado por el usuario.</td></tr>
              <tr><td><strong>Actividad en la app</strong></td><td>Registro de solicitudes, intercambios, días sueltos y lista de espera.</td></tr>
            </tbody>
          </table>
          <div className="aviso">ℹ️ No recogemos datos especialmente sensibles (salud, ideología, origen racial, etc.).</div>
        </div>

        {/* 3. FINALIDAD */}
        <div className="seccion">
          <h2>3. Finalidad y base jurídica del tratamiento</h2>
          <table className="tabla-datos">
            <tbody>
              <tr><td><strong>Gestión de la cuenta</strong></td><td>Permitir el acceso y uso de la aplicación. Base legal: ejecución de la relación contractual (art. 6.1.b RGPD).</td></tr>
              <tr><td><strong>Intercambio de días</strong></td><td>Mostrar a compañeros del mismo grupo sus solicitudes de intercambio. Base legal: ejecución del servicio (art. 6.1.b RGPD).</td></tr>
              <tr><td><strong>Notificaciones por correo</strong></td><td>Informar sobre el estado de los intercambios. Base legal: ejecución del servicio (art. 6.1.b RGPD).</td></tr>
              <tr><td><strong>Contacto por WhatsApp</strong></td><td>Compartir el número de teléfono con la contraparte una vez confirmado un intercambio. Base legal: consentimiento explícito (art. 6.1.a RGPD).</td></tr>
              <tr><td><strong>Auditoría de actividad</strong></td><td>Registro de acciones para control interno del administrador. Base legal: interés legítimo (art. 6.1.f RGPD).</td></tr>
            </tbody>
          </table>
        </div>

        {/* 4. DESTINATARIOS */}
        <div className="seccion">
          <h2>4. Destinatarios de los datos</h2>
          <p>Sus datos <span className="highlight">no se ceden ni venden a terceros</span>. Para el funcionamiento técnico de la aplicación, contamos con los siguientes encargados del tratamiento:</p>
          <table className="tabla-datos">
            <tbody>
              <tr><td><strong>Supabase Inc. (AWS)</strong></td><td>Proveedor de base de datos y autenticación. Los datos se almacenan en servidores de Amazon Web Services (UE). Dispone de las garantías adecuadas exigidas por el RGPD.</td></tr>
              <tr><td><strong>Resend Inc.</strong></td><td>Proveedor de envío de correo electrónico transaccional. Solo recibe la dirección de email del destinatario y el contenido del mensaje.</td></tr>
            </tbody>
          </table>
          <div className="aviso">ℹ️ Ambos proveedores actúan exclusivamente como encargados del tratamiento bajo las instrucciones de Coordinadora Somt y no pueden utilizar los datos para sus propios fines.</div>
        </div>

        {/* 5. CONSERVACIÓN */}
        <div className="seccion">
          <h2>5. Plazo de conservación</h2>
          <table className="tabla-datos">
            <tbody>
              <tr><td><strong>Datos de cuenta</strong></td><td>Mientras el usuario mantenga su cuenta activa en DescansApp.</td></tr>
              <tr><td><strong>Solicitudes e intercambios</strong></td><td>Se eliminan automáticamente cuando el día solicitado u ofrecido ya ha pasado.</td></tr>
              <tr><td><strong>Registros de auditoría</strong></td><td>Máximo 12 meses desde su generación.</td></tr>
              <tr><td><strong>Tras baja del usuario</strong></td><td>Una vez eliminada la cuenta, todos los datos asociados se borran de forma definitiva e irrecuperable.</td></tr>
            </tbody>
          </table>
        </div>

        {/* 6. DERECHOS */}
        <div className="seccion">
          <h2>6. Derechos del usuario</h2>
          <p>De conformidad con el RGPD y la LOPDGDD, puede ejercer en cualquier momento los siguientes derechos:</p>
          <ul>
            <li><strong>Acceso:</strong> conocer qué datos personales suyos están siendo tratados.</li>
            <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos.</li>
            <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios.</li>
            <li><strong>Oposición:</strong> oponerse al tratamiento en determinadas circunstancias.</li>
            <li><strong>Limitación:</strong> solicitar que se restrinja el tratamiento en determinadas situaciones.</li>
            <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y de uso común.</li>
          </ul>
          <p>Para ejercer estos derechos, diríjase a: <span className="highlight">descansapp@ctmvalencia.com</span> o por correo postal a <strong>Coordinadora Somt · Ampliación Muelle Sur S/N, SEVASA · 46024 Valencia</strong>.</p>
          <p>Si considera que el tratamiento no es conforme a la normativa, puede presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={{ color: '#c4a520' }}>www.aepd.es</a>.</p>
        </div>

        {/* 7. SEGURIDAD */}
        <div className="seccion">
          <h2>7. Seguridad de los datos</h2>
          <p>Coordinadora Somt aplica las siguientes medidas de seguridad:</p>
          <ul>
            <li>Cifrado de contraseñas mediante algoritmos seguros (bcrypt).</li>
            <li>Comunicaciones cifradas mediante protocolo HTTPS/TLS.</li>
            <li>Acceso a la base de datos restringido mediante políticas de seguridad a nivel de fila (Row Level Security).</li>
            <li>Autenticación de usuarios gestionada por Supabase Auth.</li>
            <li>Acceso administrativo restringido al personal autorizado.</li>
          </ul>
        </div>

        {/* 8. CONSENTIMIENTO */}
        <div className="seccion">
          <h2>8. Consentimiento y aceptación</h2>
          <p>El uso de DescansApp requiere la aceptación expresa de esta Política de Privacidad mediante un checkbox en el formulario de registro. El usuario declara:</p>
          <ul>
            <li>Haber leído y comprendido esta Política de Privacidad.</li>
            <li>Que los datos facilitados son verídicos y le pertenecen.</li>
            <li>Que consiente el tratamiento de su número de teléfono para ser compartido con la contraparte una vez confirmado un intercambio.</li>
            <li>Que puede retirar su consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento previo a su retirada.</li>
          </ul>
          <div className="aviso">ℹ️ El registro en DescansApp sin haber aceptado esta política no está permitido. La aceptación es requisito imprescindible para acceder al servicio.</div>
        </div>

        <div className="footer-priv">
          DESCANSAPP · Política de Privacidad · Coordinadora Somt · G-46125787 · 2026
        </div>
      </div>
    </>
  )
}
