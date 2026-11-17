from py_ballisticcalc import *
dm = DragModel(bc=0.267, drag_table=TableG7, weight=Weight.Grain(175), diameter=Distance.Inch(0.308), length=Distance.Inch(1.380))
ammo = Ammo(dm, mv=Velocity.MPS(794.6))
weapon = Weapon(sight_height=Distance.Millimeter(62.4), twist=Distance.Inch(10))
atmo = Atmo(altitude=Distance.Meter(0), pressure=Pressure.hPa(1013.25), temperature=Temperature.Celsius(15), humidity=0)
calc = Calculator()
shot = Shot(weapon=weapon, ammo=ammo, atmo=atmo)
zero = calc.set_weapon_zero(shot, Distance.Meter(100))
shot = Shot(weapon=weapon, ammo=ammo, atmo=atmo)
hit = calc.fire(shot, trajectory_range=Distance.Meter(1100), trajectory_step=Distance.Meter(100), extra_data=False)
print("distanza  alzo_mrad(libreria)  deriva_mrad  TOF")
for p in hit.trajectory:
    print(f"{p.distance >> Distance.Meter:7.0f} {-(p.drop_angle >> Angular.Mil):10.3f} {(p.windage_angle >> Angular.Mil):10.3f} {p.time:8.3f}")
