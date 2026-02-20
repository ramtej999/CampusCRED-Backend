payment = transaction.PaymentTxn(
    sender=borrower_address,
    sp=params,
    receiver=app_client.app_addr,
    amt=1050000
)

app_client.call(
    app.repay_loan,
    loan_id=0,
    payment=payment
)
