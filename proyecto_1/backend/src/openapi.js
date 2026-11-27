const ref = name => ({$ref: `#/components/schemas/${name}`});
const json = schema => ({'application/json': {schema}});
const error = {description: 'Error de validación, sesión, permiso, recurso o conflicto', content: json(ref('Error'))};
const responses = (schema, created = false, status) => ({[status || (created ? '201' : '200')]: {description: 'Operación completada', content: json(schema)}, '400': error, '401': error, '403': error, '404': error, '409': error, '429': error, '500': error});
const params = [{name: 'search', in: 'query', schema: {type: 'string', maxLength: 160}}, {name: 'page', in: 'query', schema: {type: 'integer', minimum: 1, default: 1}}, {name: 'limit', in: 'query', schema: {type: 'integer', minimum: 1, maximum: 100, default: 20}}];
const idParam = {name: 'id', in: 'path', required: true, schema: {type: 'string', pattern: '^[a-fA-F0-9]{24}$'}};
const property = (type, extra = {}) => ({type, ...extra});
const num = (max = 1000000000) => property('number', {minimum: 0, maximum: max});
const str = property('string');
const object = (properties, required = []) => ({type: 'object', properties, required, additionalProperties: false});
const username = property('string', {minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$', description: 'Nombre de usuario único; se normaliza a minúsculas; no es un correo'});
const contactEmail = property('string', {format: 'email', description: 'Dato de contacto; no se usa para iniciar sesión'});
const newPassword = property('string', {minLength:4, maxLength:12});
const credentials = {username, password: property('string', {minLength:4, maxLength:72, description:'Acceso compatible con contraseñas anteriores; las nuevas tienen de 4 a 12 caracteres'})};
const product = {name: property('string', {minLength: 1, maxLength: 160}), category: str, netPrice: num(), vat: num(100), tax: num(100), margin: num(1000), salePrice: num(), minStock: property('integer', {minimum: 0, maximum: 1000000})};
const operationLine = {product: property('string', {pattern: '^[a-fA-F0-9]{24}$'}), quantity: property('integer', {minimum: 1, maximum: 1000000})};
const base = {requestId: property('string', {format: 'uuid'}), note: property('string', {maxLength: 500})};
const array = items => ({type: 'array', items});
const page = name => object({items: array(ref(name)), total: property('integer'), page: property('integer'), limit: property('integer')});
const paths = {};
function endpoint(path, method, tag, summary, schema, body, options = {}) {
  paths[path] ||= {};
  paths[path][method] = {tags: [tag], summary, security: options.public ? [] : [{cookieAuth: []}, {bearerAuth: []}], ...(body ? {requestBody: {required: true, content: json(ref(body))}} : {}), parameters:[...(options.parameters||[]),{name:'X-Tab-Session',in:'header',required:false,schema:{type:'string',minLength:32,maxLength:128},description:'Clave aleatoria en memoria de la página. Si se utiliza al iniciar sesión, es obligatoria en las peticiones posteriores. No se guarda en el almacenamiento del navegador.'}], responses: responses(schema, method === 'post' && !path.includes('/auth/login') && !path.includes('/auth/logout'), options.status)};
}
endpoint('/health', 'get', 'Sistema', 'Estado de MongoDB', object({status: str}), null, {public: true});
endpoint('/auth/register', 'post', 'Sesión', 'Registro público (siempre vendedor); devuelve cookie HttpOnly', object({user: ref('User')}), 'Registration', {public: true});
endpoint('/auth/login', 'post', 'Sesión', 'Inicio de sesión; cookie de sesión con JWT de hasta 8 horas, vinculada a la pestaña si se envía X-Tab-Session', object({user: ref('User')}), 'Credentials', {public: true});
endpoint('/auth/me', 'get', 'Sesión', 'Usuario autenticado', object({user: ref('User')}));
endpoint('/auth/logout', 'post', 'Sesión', 'Revoca todas las sesiones del usuario', object({message: str}));
endpoint('/auth/password-reset/request', 'post', 'Sesión', 'Solicita autorización administrativa; respuesta genérica sin revelar cuentas; no envía correo', object({message: str}), 'ResetRequest', {public: true, status: 202});
endpoint('/auth/password-reset/confirm', 'post', 'Sesión', 'Cambia contraseña desde el navegador solicitante, con autorización administrativa sin vencimiento; consume autorización y revoca sesiones', object({message: str}), 'ResetPassword', {public: true, status: 200});
endpoint('/users', 'get', 'Usuarios', 'Administrador: lista paginada de usuarios', page('User'), null, {parameters: params});
endpoint('/users/password-reset/requests', 'get', 'Usuarios', 'Administrador: notificaciones de solicitudes pendientes', object({items:array(object({_id:str,name:str,username,passwordResetRequestedAt:property('string',{format:'date-time'})})),total:property('integer')}));
endpoint('/users', 'post', 'Usuarios', 'Administrador: crea cuenta con rol', object({user: ref('User')}), 'UserCreation');
endpoint('/users/{id}','delete','Usuarios','Administrador: elimina de forma recuperable, bloquea acceso y conserva operaciones; no permite eliminar la cuenta actual',object({message:str}),null,{parameters:[idParam]});
endpoint('/users/{id}/restore','post','Usuarios','Administrador: recupera una cuenta eliminada como inactiva',object({message:str,user:ref('User')}),null,{parameters:[idParam],status:200});
endpoint('/users/{id}/password','put','Usuarios','Administrador: cambia una clave de acceso y revoca sesiones; permite cambiar su propia clave',object({message:str,currentSessionEnded:property('boolean')}),'PasswordChange',{parameters:[idParam]});
endpoint('/users/{id}', 'patch', 'Usuarios', 'Administrador: rol y estado; prohíbe modificar cuenta propia', object({user: ref('User')}), 'UserUpdate', {parameters: [idParam]});
endpoint('/users/{id}/password-reset', 'post', 'Usuarios', 'Administrador: autoriza una solicitud pendiente sin vencimiento; otro administrador para cuenta propia', object({approvedAt: property('string', {format:'date-time'}), expiresAt: property('string', {nullable:true}), user: object({_id: str, name: str, username, email: contactEmail})}), null, {parameters: [idParam]});
endpoint('/users/{id}/password-reset', 'delete', 'Usuarios', 'Administrador: revoca autorización y solicitud de cambio', object({message: str}), null, {parameters: [idParam]});
endpoint('/catalog', 'get', 'Ventas', 'Vendedor/administrador: catálogo sin precios de compra', page('CatalogProduct'), null, {parameters: params});
endpoint('/products', 'get', 'Inventario', 'Comprador/administrador: catálogo completo', page('Product'), null, {parameters: params});
endpoint('/products', 'post', 'Inventario', 'Crea producto con ID consecutivo y cantidad inicial opcional, registrada como ajuste', object({product: ref('Product')}), 'ProductInput');
endpoint('/products/{id}', 'patch', 'Inventario', 'Actualiza ficha y cantidad disponible con ajuste transaccional; conserva código', object({product: ref('Product')}), 'ProductUpdate', {parameters: [idParam]});
endpoint('/products/{id}', 'delete', 'Inventario', 'Archiva un producto sin existencias conservando su historial', object({message: str}), null, {parameters: [idParam]});
endpoint('/products/{id}/damage', 'post', 'Inventario', 'Registra daño y descuenta existencias en una transacción', object({movement: ref('Movement')}), 'DamageInput', {parameters: [idParam]});
for (const [path, tag, singular, body] of [['sales', 'Ventas', 'sale', 'SaleInput'], ['purchases', 'Compras', 'purchase', 'PurchaseInput']]) {
  endpoint(`/${path}`, 'get', tag, path === 'sales' ? 'Vendedor: sus ventas; administrador: todas' : 'Comprador/administrador: historial de compras', page('Operation'), null, {parameters: params});
  endpoint(`/${path}`, 'post', tag, path === 'sales' ? 'Confirma venta atómica; precios leídos del servidor; requestId idempotente' : 'Confirma compra atómica y actualiza precio sugerido y de venta', object({[singular]: ref('Operation')}), body);
}
endpoint('/movements', 'get', 'Inventario', 'Comprador/administrador: historial de entradas, salidas y daños', page('Movement'), null, {parameters: params});
endpoint('/reports', 'get', 'Informes', 'Totales mensuales en America/Bogota. Vendedor solo sus ventas; demás roles con inventario y compras', ref('Report'), null, {parameters: [{name: 'year', in: 'query', schema: {type: 'integer', minimum: 2000, maximum: 2100}}]});
export const openapi = {
  openapi: '3.0.3', info: {title: 'NexusStock REST API', version: '1.0.0', description: 'Importes en pesos colombianos (COP), máximo dos decimales. IVA e impuesto adicional son porcentajes sobre el neto. Ganancia es recargo sobre costo con impuestos. Las transacciones requieren MongoDB replica set. La cookie se establece al iniciar sesión; Swagger funciona desde el mismo origen. Autorización Bearer opcional para clientes que ya dispongan de un JWT firmado.'},
  servers: [{url: '/api'}], tags: ['Sistema', 'Sesión', 'Usuarios', 'Ventas', 'Compras', 'Inventario', 'Informes'].map(name => ({name})), paths,
  components: {
    securitySchemes: {cookieAuth: {type: 'apiKey', in: 'cookie', name: 'session'}, bearerAuth: {type: 'http', scheme: 'bearer', bearerFormat: 'JWT'}},
    schemas: {
      Error: object({error: str, details: array(object({field: str, message: str}))}),
      Credentials: object(credentials, ['username', 'password']), Registration: object({...credentials, password:newPassword, name: str, email: contactEmail}, ['username', 'email', 'password', 'name']),
      UserCreation: object({...credentials, password:newPassword, name: str, email: contactEmail, role: ref('Role')}, ['username', 'email', 'password', 'name', 'role']),
      UserUpdate: object({username, role: ref('Role'), active: property('boolean')}, ['role', 'active']),
      ResetRequest: object({username}, ['username']),
      PasswordChange: object({password:newPassword,confirmPassword:newPassword},['password','confirmPassword']),
      ResetPassword: object({username, password:newPassword, confirmPassword:newPassword}, ['username','password','confirmPassword']),
      Role: property('string', {enum: ['vendedor', 'comprador', 'administrador']}),
      User: object({_id: str, name: str, username, email: contactEmail, role: ref('Role'), active: property('boolean'), passwordResetRequestedAt: property('string', {format: 'date-time', nullable: true}), passwordResetExpiresAt: property('string', {format: 'date-time', nullable: true}), passwordResetApprovedAt: property('string', {format:'date-time', nullable:true}), createdAt: property('string', {format: 'date-time'}), updatedAt: str, __v: num()}),
      ProductInput: object({...product,initialStock:property('integer',{minimum:0,maximum:1000000000,default:0,description:'Existencias iniciales de Inventario; no crea una compra'})}, ['name', 'netPrice']),
      ProductUpdate: object({...product,stock:property('integer',{minimum:0,maximum:1000000000}),expectedStock:property('integer',{minimum:0,maximum:1000000000,description:'Cantidad observada al abrir el formulario; obligatoria al ajustar stock'}),adjustmentReason:property('string',{maxLength:500})},['name','netPrice']),
      CatalogProduct: object({_id: str, code: str, name: str, category: str, salePrice: num(), stock: num(), minStock: num()}),
      Product: object({...product, _id: str, code: str, stock: num(), damaged: num(), suggestedPrice: num(), active: property('boolean'), createdAt: str, updatedAt: str, __v: num()}),
      SaleInput: object({...base, customer: str, discount: num(100), lines: {type: 'array', minItems: 1, maxItems: 100, items: object({...operationLine, discount: num(100)}, ['product', 'quantity'])}}, ['requestId', 'lines']),
      PurchaseInput: object({...base, supplier: str, lines: {type: 'array', minItems: 1, maxItems: 100, items: object({...operationLine, netPrice: num(), vat: num(100), tax: num(100), margin: num(1000)}, ['product', 'quantity', 'netPrice', 'vat', 'tax', 'margin'])}}, ['requestId', 'supplier', 'lines']),
      DamageInput: object({requestId: property('string', {format: 'uuid'}), quantity: operationLine.quantity, reason: str}, ['requestId', 'quantity', 'reason']),
      Operation: {type: 'object', properties: {_id: str, number: str, requestId: str, user: {oneOf: [str, ref('User')]}, customer: str, supplier: str, lines: array({type: 'object', properties: {...operationLine, code: str, name: str, unitPrice: num(), subtotal: num(), total: num(), discount: num(100), netPrice: num(), vat: num(100), tax: num(100), margin: num(1000)}}), subtotal: num(1000000000000000000), total: num(1000000000000000000), discount: num(100), note: str, createdAt: str}},
      Movement: {type: 'object', properties: {_id: str, product: {oneOf: [str, ref('CatalogProduct')]}, user: {oneOf: [str, ref('User')]}, kind: property('string', {enum: ['compra', 'venta', 'daño', 'ajuste']}), quantity: property('integer'), reference: str, reason: str, createdAt: str}},
      Report: object({year: num(2100), months: array(object({month: num(12), sales: num(), saleCount: num(), saleUnits: num(), purchases: num(), purchaseCount: num()})), inventory: object({products: num(), units: num(), damaged: num(), value: num(), low: num()})})
    }
  }
};
