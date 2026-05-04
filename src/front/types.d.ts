type UserRole = 'user' | 'funcionario' | 'admin';
type RentalStatus = 'agendada' | 'aguardando_locacao' | 'ativo' | 'aguardando_vistoria' | 'finalizado';
type PaymentStatus = 'nao_pago' | 'pendente' | 'aguardando_aprovacao' | 'aprovado' | 'pago' | 'rejeitado';

interface BikePrices {
    semanal: number;
    quinzenal: number;
    mensal: number;
}

interface Bike {
    id: number;
    nome: string;
    categoria: string;
    descricao: string;
    removida: boolean;
    bloqueada: boolean;
    quantidade: number;
    quantidadeDisponivel: number;
    precos: BikePrices;
}

interface Payment {
    status: PaymentStatus;
    solicitadoEm: string | null;
    aprovadoEm: string | null;
    aprovadoPor: string | null;
    motivoRejeicao?: string;
}

interface Invoice {
    id: string;
    dataVencimento: string;
    valor: number;
    status: PaymentStatus;
    pagoEm: string | null;
}

interface Rental {
    id: number;
    bikeId: number;
    bikeNome: string;
    tipo: 'semanal' | 'quinzenal' | 'mensal';
    planoLabel: string;
    preco: number;
    status: RentalStatus;
    pagamento: Payment;
    faturas: Invoice[];
    dataInicio: string;
    dataDevolucaoPrevista: string;
    diasRestantes?: number;
}

interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T;
}

declare const API_BASE: string;
declare const apiJson: <T = any>(path: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    auth?: boolean;
}) => Promise<ApiResult<T>>;
