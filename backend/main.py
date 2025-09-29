import string
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from typing import Optional,List
from pydantic import BaseModel
import sys
import os

import sys
import os

# Asegúrate de que el directorio 'backend' esté en el PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'sim-tp1-logica')))

# Ahora puedes intentar importar
from generacionNumerosAleatorios import *
from generarNumeros import *

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:5500",  # para cuando abrís el HTML directamente desde el navegador o con Live Server
    "http://localhost:5173", # por si usás Vite o React en el futuro
],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "¡Hola, mundo!"}

@app.get("/uniforme")
def getNumeroUniforme(a:int,b:int,rnd:Optional[float] = None):
    try:
        return {"numero": numeroUniforme(a, b,rnd)}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/exponencial")
def getNumeroExponencial(param: float, rnd: Optional[float] = None):
    try:
        return {"numero": numeroExponencial(param, rnd)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/normal/boxmuller")
def getNumeroNormalBoxMuller(media:float,des:float,rnd1:Optional[float] = None,rnd2:Optional[float] = None):
    try:
        return {"numero": numerosNormalBoxMuller(media,des,rnd1,rnd2)}
    except Exception as e:
        return {"error": str(e)}
    
class RndRequest(BaseModel):
    rnd: Optional[List[float]] = None

@app.get("/normal/convolucion")
def getNumeroNormalConvolucion(media: float, des: float,n:int):
    try:
        return {"numero": numeroNormalConvolucion(media, des, n)}
    except Exception as e:
        return {"error": str(e)}

@app.post("/normal/convolucion")
def getNumeroNormalConvolucion(media: float, des: float, rnd: RndRequest, n: Optional[int] = None):
    try:
        return {"numero": numeroNormalConvolucion(media, des, n,rnd.rnd)}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/poisson")
def getNumeroPoisson(lambd:float):
    try:
        return {"numero": numeroPoisson(lambd)}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/congruencial/lineal")
def getNumeroCongruencialLineal(seed:int,k:int,c:int,g:int):
    try:
        return {"numero": numeroCongruenciaLineal(seed,k,c,g)}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/congruencial/multiplicativo")
def getNumeroCongruencialLineal(seed:int,k:int,g:int):
    try:
        return {"numero": numeroCongruencialMultiplicativo(seed,k,g)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/generar/uniforme")
def getGenerarNumerosUniforme(a:int,b:int,cant:int):
    try:
        return {"Numeros": generarNumerosUniforme(a,b,cant)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/generar/exponencial")
def getGenerarNumerosExponencial(param:float,cant:int):
    try:
        return {"Numeros": generarNumerosExponencial(param,cant)}
    except Exception as e:
        return {"error": str(e)}
@app.get("/generar/normal/boxmuller")
def getGenerarNumerosNormalBoxMuller(media:float,des:float,cant:int):
    try:
        return {"Numeros": generarNumerosNormalBoxMuller(media,des,cant)}
    except Exception as e:
        return {"error": str(e)}
@app.get("/generar/normal/convolucion")
def getGenerarNumerosNormalConvolucion(media:float,des:float,n:int,cant:int):
    try:
        return {"Numeros": generarNumerosNormalConvolucion(media,des,n,cant)}
    except Exception as e:
        return {"error": str(e)}
@app.get("/generar/poisson")
def getGenerarNumerosPoisson(lambd:float,cant:int):
    try:
        return {"Numeros": generarNumerosPoisson(lambd,cant)}
    except Exception as e:
        return {"error": str(e)}

class ChiCuadradoRequest(BaseModel):
    rnd: List[float]
    a: float
    dist:str
    i: Optional[int] = None
    lambd:Optional[float] = None
    media:Optional[float] = None
    des: Optional[float]=None
@app.post("/tests/chi-cuadrado")
def testChiCuadrado(request: ChiCuadradoRequest):
    try:
        resultado = testPruebaChiCuadrado(
            request.rnd,
            request.a,
            request.dist,
            request.i,
            request.lambd,
            request.media,
            request.des
        )
        return {"Test": resultado}
    except Exception as e:
        return {"error": str(e)}
class KSRequest(BaseModel):
    rnd: List[float]
    a: float
    i: Optional[int] = None
    dist: Optional[str] = None
@app.post("/tests/k-s")
def testKS(request: KSRequest):
    try:
        resultado = testPruebaKS(request.rnd, request.a,request.dist, request.i)
        return {"Test": resultado}
    except Exception as e:
        return {"error": str(e)}