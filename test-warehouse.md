Here are all the test users for the Test Warehouse tenant:          
                                                                
  User: Tenant Admin                                        
  Email: admin@testwarehouse.com                                      
  Password: TestPass123!                                              
  Role: tenant_admin                                                  
  Key Permissions: All (auto-granted)                                 
  ────────────────────────────────────────                            
  User: Purchase Manager                                    
  Email: buyer@testwarehouse.com      
  Password: TestPass123!
  Role: employee
  Key Permissions: canPurchase, canViewStock, canManageContacts
  ────────────────────────────────────────
  User: Warehouse Operator
  Email: warehouse@testwarehouse.com
  Password: TestPass123!
  Role: employee
  Key Permissions: canDispatch, canReceive, canViewStock,
    canManageLocations
  ────────────────────────────────────────
  User: View-Only User
  Email: viewer@testwarehouse.com
  Password: TestPass123!
  Role: employee
  Key Permissions: canViewStock only

  All users log in at https://wareos.in/login and are linked to the
  tenant at /t/test-warehouse/.