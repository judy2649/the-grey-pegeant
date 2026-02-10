$body = @{
    bookingId = "HLujVUhLAu8ROp6Zd5MO"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://the-grey-pegeant.vercel.app/api/admin/delete-booking" -Method Post -ContentType "application/json" -Body $body
