from fastapi import FastAPI

app = FastAPI(title="PolarOps API", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers - uncomment each line as its module lands (Phase 2+):
# from app.api.routes import auth, voyages, cargo, indents, inventory
# from app.api.routes import assets, personnel, emergency, forecast, optimize, sync, audit
# app.include_router(auth.router,      prefix="/auth",      tags=["auth"])
# app.include_router(voyages.router,   prefix="/voyages",   tags=["voyages"])
# app.include_router(cargo.router,     prefix="/cargo",     tags=["cargo"])
# app.include_router(indents.router,   prefix="/indents",   tags=["indents"])
# app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
# app.include_router(assets.router,    prefix="/assets",    tags=["assets"])
# app.include_router(personnel.router, prefix="/personnel", tags=["personnel"])
# app.include_router(emergency.router, prefix="/emergency", tags=["emergency"])
# app.include_router(forecast.router,  prefix="/forecast",  tags=["forecast"])
# app.include_router(optimize.router,  prefix="/optimize",  tags=["optimize"])
# app.include_router(sync.router,      prefix="/sync",      tags=["sync"])
# app.include_router(audit.router,     prefix="/audit",     tags=["audit"])
