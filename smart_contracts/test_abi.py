from pyteal import *
class LoanRecord(abi.NamedTuple):
    lender: abi.Field[abi.Address]
    borrower: abi.Field[abi.Address]
    amount: abi.Field[abi.Uint64]
    deadline: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint64]
print("Success")
