from beaker import Application, GlobalStateValue, LocalStateValue
from beaker.lib.storage import BoxMapping
from pyteal import *

# Define the ABI struct for a Loan
class LoanRecord(abi.NamedTuple):
    lender: abi.Field[abi.Address]
    borrower: abi.Field[abi.Address]
    amount: abi.Field[abi.Uint64]
    deadline: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint64]  # 1=active, 2=repaid, 3=defaulted

class P2PLendingState:
    # GLOBAL STATE
    total_loans = GlobalStateValue(stack_type=TealType.uint64, default=Int(0))
    active_loans = GlobalStateValue(stack_type=TealType.uint64, default=Int(0))

    # LOCAL STATE (Reputation/Stats per user)
    total_loans_taken = LocalStateValue(stack_type=TealType.uint64, default=Int(0))
    total_loans_repaid = LocalStateValue(stack_type=TealType.uint64, default=Int(0))
    total_defaults = LocalStateValue(stack_type=TealType.uint64, default=Int(0))

    # BOX STORAGE for loans (loan_id string -> LoanRecord mapping)
    loans = BoxMapping(abi.String, LoanRecord)

app = Application("P2PLending", state=P2PLendingState())

@app.create(bare=True)
def create() -> Expr:
    return app.initialize_global_state()

@app.opt_in(bare=True)
def opt_in() -> Expr:
    return app.initialize_local_state()

@app.external
def create_loan(
    loan_id: abi.String,
    lender: abi.Account,
    borrower: abi.Account,
    amount: abi.Uint64,
    deadline: abi.Uint64
) -> Expr:
    # This acts as both request and accept combined conceptually,
    # or the backend calls it after both agree.
    
    # Must send payment equal to loan_amount from lender to borrower
    status = abi.Uint64()
    loan = LoanRecord()
    
    lender_addr = abi.Address()
    borrower_addr = abi.Address()

    return Seq(
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].sender() == lender.address()),
        Assert(Gtxn[0].receiver() == borrower.address()),
        Assert(Gtxn[0].amount() == amount.get()),

        status.set(Int(1)), # 1 = active
        lender_addr.set(lender.address()),
        borrower_addr.set(borrower.address()),
        
        # Populate the record
        loan.set(
            lender_addr,
            borrower_addr,
            amount,
            deadline,
            status
        ),
        
        # Store in Box
        app.state.loans[loan_id.get()].set(loan),
        
        # Update metrics
        app.state.active_loans.increment(),
        app.state.total_loans.increment(),
        app.state.total_loans_taken[borrower.address()].increment()
    )

@app.external
def repay_loan(loan_id: abi.String) -> Expr:
    loan = LoanRecord()
    lender = abi.Address()
    borrower = abi.Address()
    amount = abi.Uint64()
    status = abi.Uint64()
    new_status = abi.Uint64()
    
    deadline = abi.Uint64()

    return Seq(
        # Read loan
        loan.decode(app.state.loans[loan_id.get()].get()),
        
        # Ensure it exists and is active
        loan.status.store_into(status),
        Assert(status.get() == Int(1)),
        
        loan.lender.store_into(lender),
        loan.borrower.store_into(borrower),
        loan.amount.store_into(amount),
        loan.deadline.store_into(deadline),
        
        # Validate payment from borrower to lender
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].sender() == borrower.get()),
        Assert(Gtxn[0].receiver() == lender.get()),
        Assert(Gtxn[0].amount() >= amount.get()),
        
        # Update status
        new_status.set(Int(2)), # 2 = repaid
        loan.set(lender, borrower, amount, deadline, new_status),
        
        # Save back to Box
        app.state.loans[loan_id.get()].set(loan),
        
        # Update metrics
        app.state.active_loans.decrement(),
        app.state.total_loans_repaid[borrower.get()].increment()
    )

@app.external
def mark_default(loan_id: abi.String) -> Expr:
    loan = LoanRecord()
    deadline = abi.Uint64()
    status = abi.Uint64()
    new_status = abi.Uint64()
    borrower = abi.Address()
    
    lender = abi.Address()
    amount = abi.Uint64()

    return Seq(
        loan.decode(app.state.loans[loan_id.get()].get()),
        
        loan.status.store_into(status),
        Assert(status.get() == Int(1)), # Must be active
        
        loan.deadline.store_into(deadline),
        Assert(Global.latest_timestamp() > deadline.get()),
        
        loan.borrower.store_into(borrower),
        loan.lender.store_into(lender),
        loan.amount.store_into(amount),
        
        # Update status
        new_status.set(Int(3)), # 3 = defaulted
        loan.set(lender, borrower, amount, deadline, new_status),
        
        # Save back
        app.state.loans[loan_id.get()].set(loan),
        
        # Update metrics
        app.state.active_loans.decrement(),
        app.state.total_defaults[borrower.get()].increment()
    )

@app.external(read_only=True)
def get_user_reputation(user: abi.Account, *, output: abi.Tuple3[abi.Uint64, abi.Uint64, abi.Uint64]) -> Expr:
    taken = abi.Uint64()
    repaid = abi.Uint64()
    defaulted = abi.Uint64()
    
    return Seq(
        taken.set(app.state.total_loans_taken[user.address()].get()),
        repaid.set(app.state.total_loans_repaid[user.address()].get()),
        defaulted.set(app.state.total_defaults[user.address()].get()),
        output.set(taken, repaid, defaulted)
    )
    
if __name__ == "__main__":
    app.build().export("artifacts")
