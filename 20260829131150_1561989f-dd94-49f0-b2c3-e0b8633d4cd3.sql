UPDATE public.payment_methods
SET details = E'Bank name: (add yours)\nAccount number: (add yours)\nAccount name: (add yours)'
WHERE kind = 'bank';